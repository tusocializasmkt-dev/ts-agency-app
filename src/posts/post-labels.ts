import type { PostStatus, PostType } from '../types';

export const postStatusLabels: Record<PostStatus, string> = {
  pending: 'Pendente', approved: 'Aprovado', rejected: 'Reprovado',
  changes_requested: 'Ajustes solicitados', scheduled: 'Agendado',
};
export const postTypeLabels: Record<PostType, string> = {
  feed: 'Feed', reels: 'Reels', stories: 'Stories', carousel: 'Carrossel', other: 'Outro',
};
