import type { Post } from '../types';

export const feedFilters = {
  ongoing: 'Em andamento', pending: 'Pendentes de aprovação', approved: 'Aprovadas',
  recent: 'Aprovadas recentemente', changes_requested: 'Em ajustes',
  published: 'Já postadas', all: 'Todas',
} as const;
export type FeedFilter = keyof typeof feedFilters;

export function matchesPostSearch(post: Post, search: string): boolean {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const text = normalize(`${post.title ?? ''} ${post.caption ?? ''}`);
  return normalize(search).trim().split(/\s+/).every(word => text.includes(word));
}

function approvalTime(post: Post): number {
  const date = post.approvedAt;
  return date && 'toMillis' in date ? date.toMillis() : 0;
}

export function filterFeed(posts: Post[], filter: FeedFilter): Post[] {
  const result = posts.filter(post => {
    if (filter === 'all') return true;
    if (filter === 'published') return post.published === true;
    if (post.published) return false;
    if (filter === 'ongoing') return true;
    return post.status === (filter === 'recent' ? 'approved' : filter);
  });
  return filter === 'recent' ? result.sort((a, b) => approvalTime(b) - approvalTime(a)) : result;
}
