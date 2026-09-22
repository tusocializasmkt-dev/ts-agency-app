import { renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { usePosts } from '../hooks/usePosts';
const service = vi.hoisted(() => ({ watchPosts: vi.fn(), watchBrandPosts: vi.fn(), watchScopedPosts: vi.fn(), watchCalendarPosts: vi.fn(), watchScopedCalendarPosts: vi.fn(), createPost: vi.fn(), editPost: vi.fn(), trashPost: vi.fn(), approvePost: vi.fn(), rejectPost: vi.fn(), requestPostChanges: vi.fn() }));
vi.mock('../services', () => service);
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ isTeamMember: true, brandIds: ['allowed'] }) }));
beforeEach(() => vi.clearAllMocks());
it('query não é iniciada para marca fora de brandIds', () => {
  const { result } = renderHook(() => usePosts({ brandId: 'forbidden' }));
  expect(result.current.posts).toEqual([]);
  expect(service.watchBrandPosts).not.toHaveBeenCalled(); expect(service.watchPosts).not.toHaveBeenCalled();
});
it('query usa marca permitida ou conjunto restrito quando sem filtro', () => {
  const view = renderHook(() => usePosts({ brandId: 'allowed' }));
  expect(service.watchBrandPosts.mock.calls[0][0]).toBe('allowed'); view.unmount();
  renderHook(() => usePosts());
  expect(service.watchScopedPosts.mock.calls[0][0]).toEqual(['allowed']); expect(service.watchPosts).not.toHaveBeenCalled();
});
