import { beforeEach, describe, expect, it, vi } from 'vitest';
const repositories = vi.hoisted(() => ({ createPost: vi.fn(), movePostToTrash: vi.fn(), updatePost: vi.fn(), getPostById: vi.fn(), commitPostDecision: vi.fn(), subscribeToPostHistory: vi.fn(), subscribeToPosts: vi.fn(), subscribeToPostsByBrand: vi.fn(), subscribeToPostsByMonth: vi.fn(), subscribeToNotifications: vi.fn(), subscribeToUnreadCount: vi.fn(), markNotificationAsRead: vi.fn(), markAllNotificationsAsRead: vi.fn(), createNotification: vi.fn(), listAdminUids: vi.fn() }));
const media = vi.hoisted(() => ({ loadMediaByIds: vi.fn() }));
vi.mock('../data/repositories', () => repositories); vi.mock('../services/media.service', () => media);
import { createPost, validatePostMedia } from '../services/posts.service';
const asset = (id: string, brandId = 'b', mediaType: 'image' | 'video' = 'image') => ({ id, brandId, mediaType });

describe('post service media validation', () => {
  beforeEach(() => { vi.clearAllMocks(); repositories.createPost.mockResolvedValue('p'); media.loadMediaByIds.mockImplementation(async (ids: string[]) => ids.map(id => asset(id))); });
  it('aceita mesma marca e define capa padrão', async () => { await createPost('b', { type: 'feed', mediaIds: ['m1', 'm2'] }); expect(repositories.createPost).toHaveBeenCalledWith(expect.objectContaining({ mediaIds: ['m1', 'm2'], coverMediaId: 'm1', brandId: 'b' })); });
  it('rejeita duplicata, limite e capa inválida', async () => { await expect(validatePostMedia('b', { mediaIds: ['m', 'm'] })).rejects.toMatchObject({ code: 'duplicate-media' }); await expect(validatePostMedia('b', { mediaIds: Array.from({ length: 11 }, (_, index) => `m${index}`) })).rejects.toMatchObject({ code: 'media-limit' }); await expect(validatePostMedia('b', { mediaIds: ['m'], coverMediaId: 'x' })).rejects.toMatchObject({ code: 'invalid-cover' }); });
  it('rejeita mídia de outra marca', async () => { media.loadMediaByIds.mockResolvedValue([asset('m', 'other')]); await expect(validatePostMedia('b', { mediaIds: ['m'] })).rejects.toMatchObject({ code: 'wrong-brand' }); });
  it('valida carousel e reels', async () => { await expect(validatePostMedia('b', { type: 'carousel', mediaIds: ['m'] })).rejects.toMatchObject({ code: 'invalid-carousel' }); await expect(validatePostMedia('b', { type: 'reels', mediaIds: ['m'] })).rejects.toMatchObject({ code: 'invalid-reels' }); media.loadMediaByIds.mockResolvedValue([asset('v', 'b', 'video')]); await expect(validatePostMedia('b', { type: 'reels', mediaIds: ['v'] })).resolves.toMatchObject({ mediaIds: ['v'] }); });
});
