import { useCallback, useEffect, useState } from 'react';
import type { Post, PostStatus } from '../types';
import { approvePost, createPost, editPost, rejectPost, requestPostChanges, trashPost, watchBrandPosts, watchCalendarPosts, watchPosts, watchScopedCalendarPosts, watchScopedPosts } from '../services';
import { useAuth } from '../contexts/AuthContext';

interface UsePostsOptions { brandId?: string | null; month?: string; status?: PostStatus; actorUid?: string; actorRole?: import('../types').UserRole; }

export function usePosts({ brandId, month, status, actorUid = '', actorRole = 'client' }: UsePostsOptions = {}) {
  const { isTeamMember, brandIds } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    const onData = (data: Post[]) => { setPosts(data); setLoading(false); };
    const onError = () => { setError('Não foi possível carregar os posts.'); setLoading(false); };
    if (isTeamMember && brandId && !brandIds.includes(brandId)) { onData([]); return; }
    if (month) return isTeamMember && !brandId ? watchScopedCalendarPosts(brandIds, month, onData, onError) : watchCalendarPosts(brandId ?? null, month, onData, onError);
    if (brandId) return watchBrandPosts(brandId, onData, onError, status);
    return isTeamMember ? watchScopedPosts(brandIds, onData, onError, status) : watchPosts(onData, onError, status);
  }, [brandId, month, status, isTeamMember, brandIds.join('|')]);

  const run = useCallback(async (command: () => Promise<void>, message: string) => {
    setError(null);
    try { await command(); }
    catch (cause) { setError(message); throw cause; }
  }, []);

  return {
    posts, loading, error, resetError: () => setError(null),
    create: (targetBrandId: string, data: Partial<Post>) => run(async () => { await createPost(targetBrandId, data); }, 'Não foi possível criar o post.'),
    update: (id: string, data: Partial<Post>) => run(() => editPost(id, data, { actorUid, actorRole }), 'Não foi possível atualizar o post.'),
    remove: (id: string) => run(() => trashPost(id), 'Não foi possível mover o post para a lixeira.'),
    approve: (id: string) => run(() => approvePost(id, { actorUid, actorRole }), 'Não foi possível aprovar o post.'),
    reject: (id: string, feedback: string) => run(() => rejectPost(id, feedback, { actorUid, actorRole }), 'Não foi possível reprovar o post.'),
    requestChanges: (id: string, feedback: string) => run(() => requestPostChanges(id, feedback, { actorUid, actorRole }), 'Não foi possível solicitar ajustes.'),
  };
}
