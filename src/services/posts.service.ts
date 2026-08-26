import { MAX_MEDIA_PER_POST, type MediaAsset } from '../media';
import type { Post, PostDecisionAction, PostStatus, UserRole } from '../types';
import { commitPostDecision, createPost as persistPost, getPostById, movePostToTrash, subscribeToPostHistory, subscribeToPosts, subscribeToPostsByBrand, subscribeToPostsByBrands, subscribeToPostsByBrandsAndMonth, subscribeToPostsByMonth, updatePost } from '../data/repositories';
import { loadMediaByIds } from './media.service';
import { POST_FEEDBACK_MAX_LENGTH, POST_FEEDBACK_MIN_LENGTH } from '../posts';
import { notifyPostApproved, notifyPostChangesRequested, notifyPostCreated, notifyPostRejected, notifyPostResubmitted } from './notifications.service';

export const watchPosts = subscribeToPosts;
export const watchBrandPosts = subscribeToPostsByBrand;
export const watchCalendarPosts = subscribeToPostsByMonth;
export const watchScopedPosts = subscribeToPostsByBrands;
export const watchScopedCalendarPosts = subscribeToPostsByBrandsAndMonth;
export const watchPostDecisionHistory = subscribeToPostHistory;
export const trashPost = movePostToTrash;
export interface DecisionActor { actorUid: string; actorRole: UserRole; }

export class PostMediaError extends Error {
  constructor(public readonly code: 'duplicate-media' | 'media-limit' | 'invalid-cover' | 'wrong-brand' | 'missing-media' | 'invalid-carousel' | 'invalid-reels') { super({ 'duplicate-media': 'Uma mídia não pode aparecer duas vezes no post.', 'media-limit': 'O post excede a quantidade máxima de mídias.', 'invalid-cover': 'A capa precisa pertencer às mídias selecionadas.', 'wrong-brand': 'Todas as mídias devem pertencer ao mesmo cliente do post.', 'missing-media': 'Uma ou mais mídias selecionadas não foram encontradas.', 'invalid-carousel': 'Um carrossel precisa de pelo menos duas mídias.', 'invalid-reels': 'Reels precisa possuir uma mídia de vídeo.' }[code]); this.name = 'PostMediaError'; }
}

export async function validatePostMedia(brandId: string, data: Partial<Post>): Promise<{ mediaIds?: string[]; coverMediaId?: string; assets: MediaAsset[] }> {
  if (!data.mediaIds) return { assets: [] };
  const mediaIds = data.mediaIds.filter(Boolean);
  if (new Set(mediaIds).size !== mediaIds.length) throw new PostMediaError('duplicate-media');
  if (mediaIds.length > MAX_MEDIA_PER_POST) throw new PostMediaError('media-limit');
  if (data.coverMediaId && !mediaIds.includes(data.coverMediaId)) throw new PostMediaError('invalid-cover');
  const assets = await loadMediaByIds(mediaIds);
  if (assets.length !== mediaIds.length) throw new PostMediaError('missing-media');
  if (assets.some(asset => asset.brandId !== brandId)) throw new PostMediaError('wrong-brand');
  if (data.type === 'carousel' && mediaIds.length < 2) throw new PostMediaError('invalid-carousel');
  if (data.type === 'reels' && mediaIds.length && !assets.some(asset => asset.mediaType === 'video')) throw new PostMediaError('invalid-reels');
  return { mediaIds, coverMediaId: mediaIds.length ? data.coverMediaId ?? mediaIds[0] : undefined, assets };
}

export async function createPost(brandId: string, data: Partial<Post>) {
  const selection = await validatePostMedia(brandId, data);
  const id = await persistPost({ ...data, ...selection.mediaIds ? { mediaIds: selection.mediaIds, coverMediaId: selection.coverMediaId } : {}, brandId, status: data.status === 'scheduled' ? 'scheduled' : 'pending' });
  try { await notifyPostCreated(brandId, id); } catch { /* A notificação não invalida a criação principal. */ }
  return id;
}

export async function editPost(id: string, data: Partial<Post>, actor?: DecisionActor) {
  let changes = data;
  if (data.mediaIds) { if (!data.brandId) throw new PostMediaError('wrong-brand'); const selection = await validatePostMedia(data.brandId, data); changes = { ...data, mediaIds: selection.mediaIds, coverMediaId: selection.coverMediaId }; }
  const current = await getPostById(id);
  if (current && ['rejected', 'changes_requested'].includes(current.status)) {
    if (!actor?.actorUid || !['admin', 'manager', 'social_media'].includes(actor.actorRole)) throw new PostDecisionError('invalid-actor');
    await commitPostDecision(id, 'pending', '', { postId: id, brandId: current.brandId, action: 'resubmitted', previousStatus: current.status, newStatus: 'pending', actorUid: actor.actorUid, actorRole: actor.actorRole }, changes);
    try { await notifyPostResubmitted(current.brandId, id); } catch { /* A notificação não invalida a ressubmissão. */ }
    return;
  }
  return updatePost(id, changes);
}

export class PostDecisionError extends Error {
  constructor(public readonly code: 'feedback-required' | 'feedback-too-long' | 'post-not-found' | 'invalid-transition' | 'invalid-actor') { super({ 'feedback-required': `O feedback deve ter pelo menos ${POST_FEEDBACK_MIN_LENGTH} caracteres.`, 'feedback-too-long': `O feedback deve ter no máximo ${POST_FEEDBACK_MAX_LENGTH} caracteres.`, 'post-not-found': 'O post não foi encontrado.', 'invalid-transition': 'Esta decisão não é permitida no status atual.', 'invalid-actor': 'Não foi possível identificar o autor da decisão.' }[code]); this.name = 'PostDecisionError'; }
}

function normalizeFeedback(feedback: string, required: boolean): string { const value = feedback.trim(); if (required && value.length < POST_FEEDBACK_MIN_LENGTH) throw new PostDecisionError('feedback-required'); if (value.length > POST_FEEDBACK_MAX_LENGTH) throw new PostDecisionError('feedback-too-long'); return value; }
async function decidePost(id: string, action: Exclude<PostDecisionAction, 'resubmitted'>, actor: DecisionActor, feedback = '') {
  if (!actor.actorUid || !['admin', 'manager', 'social_media', 'client'].includes(actor.actorRole)) throw new PostDecisionError('invalid-actor');
  const post = await getPostById(id); if (!post) throw new PostDecisionError('post-not-found');
  if (post.status !== 'pending') throw new PostDecisionError('invalid-transition');
  const required = action !== 'approved'; const normalized = normalizeFeedback(feedback, required);
  const newStatus: PostStatus = action === 'approved' ? 'approved' : action === 'rejected' ? 'rejected' : 'changes_requested';
  await commitPostDecision(id, newStatus, action === 'approved' ? '' : normalized, { postId: id, brandId: post.brandId, action, previousStatus: post.status, newStatus, feedback: action === 'approved' ? undefined : normalized, actorUid: actor.actorUid, actorRole: actor.actorRole });
  try { if (action === 'approved') await notifyPostApproved(post.brandId, id); else if (action === 'rejected') await notifyPostRejected(post.brandId, id); else await notifyPostChangesRequested(post.brandId, id); } catch { /* A decisão principal permanece válida. */ }
}
export const approvePost = (id: string, actor: DecisionActor) => decidePost(id, 'approved', actor);
export const rejectPost = (id: string, feedback: string, actor: DecisionActor) => decidePost(id, 'rejected', actor, feedback);
export const requestPostChanges = (id: string, feedback: string, actor: DecisionActor) => decidePost(id, 'changes_requested', actor, feedback);
