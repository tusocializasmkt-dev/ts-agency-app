import { describe, expect, it, vi } from 'vitest';
vi.mock('firebase/firestore', () => ({ Timestamp: class Timestamp {} }));
import { mapPost, toPostWriteData } from '../data/mappers/post.mapper';

describe('post mapper com mídia', () => {
  it('normaliza IDs, capa e legado', () => { const post = mapPost({ id: 'p', data: () => ({ type: 'feed', mediaIds: ['m1', 'm1', '', 'm2'], coverMediaId: 'm2', mediaUrls: ['old', 'old'], mediaUrl: 'legacy' }) } as never); expect(post.mediaIds).toEqual(['m1', 'm2']); expect(post.coverMediaId).toBe('m2'); expect(post.mediaUrls).toEqual(['old']); expect(post.mediaUrl).toBe('legacy'); });
  it('descarta capa fora da lista e não persiste undefined', () => { expect(toPostWriteData({ id: 'p', mediaIds: ['m1', 'm1'], coverMediaId: 'other', mediaUrl: undefined })).toEqual({ mediaIds: ['m1'] }); });
});
