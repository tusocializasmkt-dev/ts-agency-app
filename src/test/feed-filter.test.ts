import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { filterFeed } from '../posts/feed-filter';
import type { Post } from '../types';

const post = (id: string, status: Post['status'], extra: Partial<Post> = {}): Post => ({ id, status, brandId: 'b', type: 'feed', caption: id, socialNetwork: 'instagram', scheduledDate: '2026-10-01', ...extra });
const posts = [post('old', 'approved'), post('pending', 'pending'), post('posted', 'approved', { published: true }), post('rejected', 'rejected'), post('changes', 'changes_requested'), post('early', 'approved', { approvedAt: Timestamp.fromMillis(1000) }), post('late', 'approved', { approvedAt: Timestamp.fromMillis(2000) })];
describe('fila de publicação', () => {
  it('preserva ordem e inclui legados, ajustes e reprovadas na fila padrão', () => {
    expect(filterFeed(posts, 'ongoing').map(p => p.id)).toEqual(['old', 'pending', 'rejected', 'changes', 'early', 'late']);
  });
  it('recupera postadas e retorna à fila após desmarcar', () => {
    expect(filterFeed(posts, 'published').map(p => p.id)).toEqual(['posted']);
    expect(filterFeed(posts.map(p => ({ ...p, published: false })), 'ongoing')).toHaveLength(posts.length);
    expect(filterFeed(posts, 'all')).toEqual(posts);
  });
  it('filtra decisões e ordena aprovações pela data real sem inventar data para legados', () => {
    expect(filterFeed(posts, 'approved').map(p => p.id)).toEqual(['old', 'early', 'late']);
    expect(filterFeed(posts, 'recent').map(p => p.id)).toEqual(['late', 'early', 'old']);
    expect(filterFeed(posts, 'pending').map(p => p.id)).toEqual(['pending']);
    expect(filterFeed(posts, 'changes_requested').map(p => p.id)).toEqual(['changes']);
    expect(posts[0].id).toBe('old');
  });
});
