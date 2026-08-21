import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBrands } from '../hooks/useBrands';
import { usePosts } from '../hooks/usePosts';
import { useInvoices } from '../hooks/useInvoices';
import { useMetrics } from '../hooks/useMetrics';
import { useTrash } from '../hooks/useTrash';
import { useAgencyConfig } from '../hooks/useAgencyConfig';

const services = vi.hoisted(() => ({
  watchBrands: vi.fn(), loadBrand: vi.fn(), saveBrand: vi.fn(), saveClientProfile: vi.fn(),
  watchPosts: vi.fn(), watchBrandPosts: vi.fn(), watchCalendarPosts: vi.fn(), createPost: vi.fn(), editPost: vi.fn(), approvePost: vi.fn(), rejectPost: vi.fn(), requestPostChanges: vi.fn(),
  watchInvoices: vi.fn(), watchBrandInvoices: vi.fn(), watchInvoiceHistory: vi.fn(), createInvoice: vi.fn(), editInvoice: vi.fn(), markPaid: vi.fn(), suspendInvoice: vi.fn(), resumeInvoice: vi.fn(), cancelInvoice: vi.fn(), replaceBoleto: vi.fn(), requestPaymentPromise: vi.fn(), approvePaymentPromise: vi.fn(), rejectPaymentPromise: vi.fn(),
  watchOrganicMetrics: vi.fn(), watchPaidMetrics: vi.fn(), saveOrganicMetrics: vi.fn(), savePaidMetrics: vi.fn(), watchTrash: vi.fn(), restoreItem: vi.fn(), deleteItemPermanently: vi.fn(),
  watchAgencyConfig: vi.fn(), saveAgencyConfig: vi.fn(),
}));
vi.mock('../services', () => services);

describe('hooks de dados', () => {
  beforeEach(() => { vi.clearAllMocks(); Object.values(services).forEach(mock => mock.mockResolvedValue?.(undefined)); });
  it('useBrands recebe dados, limpa subscription, executa comando e erro/reset', async () => {
    const unsubscribe = vi.fn(); services.watchBrands.mockImplementation((data) => { data([{ id: 'b' }]); return unsubscribe; });
    const { result, unmount } = renderHook(() => useBrands()); await waitFor(() => expect(result.current.loading).toBe(false)); expect(result.current.brands).toHaveLength(1); await act(() => result.current.update('b', {})); expect(services.saveBrand).toHaveBeenCalled(); unmount(); expect(unsubscribe).toHaveBeenCalled();
    services.saveBrand.mockRejectedValueOnce(new Error()); const failed = renderHook(() => useBrands(undefined, false)); await expect(failed.result.current.update('b', {})).rejects.toThrow(); await waitFor(() => expect(failed.result.current.error).toMatch(/salvar/)); act(() => failed.result.current.resetError()); expect(failed.result.current.error).toBeNull();
  });
  it('usePosts recebe dados, limpa subscription e aprova', async () => {
    const unsubscribe = vi.fn(); services.watchPosts.mockImplementation((data) => { data([{ id: 'p' }]); return unsubscribe; }); const { result, unmount } = renderHook(() => usePosts({ actorUid: 'u', actorRole: 'client' })); await waitFor(() => expect(result.current.loading).toBe(false)); await act(() => result.current.approve('p')); expect(services.approvePost).toHaveBeenCalledWith('p', { actorUid: 'u', actorRole: 'client' }); unmount(); expect(unsubscribe).toHaveBeenCalled();
  });
  it('useInvoices recebe erro, reseta e registra promessa', async () => {
    const unsubscribe = vi.fn(); services.watchInvoices.mockImplementation((_data, error) => { error(new Error()); return unsubscribe; }); const { result, unmount } = renderHook(() => useInvoices()); await waitFor(() => expect(result.current.error).not.toBeNull()); act(() => result.current.resetError()); expect(result.current.error).toBeNull(); unmount(); expect(unsubscribe).toHaveBeenCalled();
  });
  it('useMetrics aguarda as duas fontes e limpa ambas', async () => {
    const a = vi.fn(); const b = vi.fn(); services.watchOrganicMetrics.mockImplementation((_id, data) => { data([{ id: 'o' }]); return a; }); services.watchPaidMetrics.mockImplementation((_id, data) => { data([{ id: 'p' }]); return b; }); const { result, unmount } = renderHook(() => useMetrics('brand')); await waitFor(() => expect(result.current.loading).toBe(false)); expect(result.current.organic).toHaveLength(1); expect(result.current.paid).toHaveLength(1); unmount(); expect(a).toHaveBeenCalled(); expect(b).toHaveBeenCalled();
  });
  it('useTrash e useAgencyConfig recebem dados, limpam e mutam', async () => {
    const u1 = vi.fn(); const u2 = vi.fn(); services.watchTrash.mockImplementation((data) => { data([{ id: 't' }]); return u1; }); services.watchAgencyConfig.mockImplementation((data) => { data({ name: 'A' }); return u2; }); const trash = renderHook(() => useTrash()); const config = renderHook(() => useAgencyConfig()); await waitFor(() => expect(trash.result.current.loading).toBe(false)); await waitFor(() => expect(config.result.current.loading).toBe(false)); await act(() => trash.result.current.removePermanently('t')); await act(() => config.result.current.save({ name: 'B' } as never)); expect(services.deleteItemPermanently).toHaveBeenCalled(); expect(services.saveAgencyConfig).toHaveBeenCalled(); trash.unmount(); config.unmount(); expect(u1).toHaveBeenCalled(); expect(u2).toHaveBeenCalled();
  });
});
