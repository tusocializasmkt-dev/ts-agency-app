import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositories = vi.hoisted(() => ({
  subscribeToBrands: vi.fn(), getBrandById: vi.fn(), createBrand: vi.fn(), updateBrand: vi.fn(), updateClientEditableFields: vi.fn(),
  createPost: vi.fn(), movePostToTrash: vi.fn(), subscribeToPosts: vi.fn(), subscribeToPostsByBrand: vi.fn(), subscribeToPostsByMonth: vi.fn(), subscribeToPostHistory: vi.fn(), updatePost: vi.fn(), getPostById: vi.fn(), commitPostDecision: vi.fn(),
  subscribeToInvoices: vi.fn(), subscribeToInvoicesByBrand: vi.fn(), subscribeToInvoiceHistory: vi.fn(), getInvoiceById: vi.fn(), createInvoice: vi.fn(), updateInvoice: vi.fn(), markInvoicePaid: vi.fn(), suspendInvoice: vi.fn(), resumeInvoice: vi.fn(), cancelInvoice: vi.fn(), replaceInvoiceBoleto: vi.fn(), reviewPaymentPromise: vi.fn(),
  subscribeToTrash: vi.fn(), restoreTrashItem: vi.fn(), permanentlyDeleteTrashItem: vi.fn(),
  subscribeToAgencyConfig: vi.fn(), updateAgencyConfig: vi.fn(),
  subscribeToOrganicMetrics: vi.fn(), subscribeToPaidMetrics: vi.fn(), upsertOrganicMetrics: vi.fn(), upsertPaidMetrics: vi.fn(),
  subscribeToNotifications: vi.fn(), subscribeToUnreadCount: vi.fn(), markNotificationAsRead: vi.fn(), markAllNotificationsAsRead: vi.fn(), createNotification: vi.fn(), listAdminUids: vi.fn(),
}));
vi.mock('../data/repositories', () => repositories);

import * as brands from '../services/brands.service';
import * as posts from '../services/posts.service';
import * as invoices from '../services/invoices.service';
import * as trash from '../services/trash.service';
import * as config from '../services/agency-config.service';
import * as metrics from '../services/metrics.service';

describe('services delegam aos repositories', () => {
  beforeEach(() => { vi.clearAllMocks(); repositories.getPostById.mockResolvedValue({ id: 'p', brandId: 'b', status: 'pending' }); repositories.createPost.mockResolvedValue('new-post'); repositories.listAdminUids.mockResolvedValue(['admin-1']); });
  it('Brands acompanha, carrega e salva', async () => {
    brands.watchBrands(vi.fn(), vi.fn()); brands.loadBrand('b'); await brands.addBrand({ name: 'Nova' } as never); await brands.saveBrand('b', { name: 'B' }); await brands.saveClientProfile('b', { responsible: 'R', phone: '1', website: 'w' });
    expect(repositories.subscribeToBrands).toHaveBeenCalled(); expect(repositories.getBrandById).toHaveBeenCalledWith('b'); expect(repositories.createBrand).toHaveBeenCalled(); expect(repositories.updateBrand).toHaveBeenCalled(); expect(repositories.updateClientEditableFields).toHaveBeenCalled();
  });
  it('Posts aplica casos de uso e status canônicos', async () => {
    const actor = { actorUid: 'client-1', actorRole: 'client' as const };
    await posts.createPost('b', { caption: 'x' }); await posts.editPost('p', { caption: 'y' }); await posts.approvePost('p', actor); await posts.rejectPost('p', 'não', actor); await posts.requestPostChanges('p', 'ajuste', actor); posts.watchCalendarPosts('b', '2026-01', vi.fn(), vi.fn());
    expect(repositories.createPost).toHaveBeenCalledWith(expect.objectContaining({ brandId: 'b', status: 'pending' }));
    expect(repositories.commitPostDecision).toHaveBeenNthCalledWith(1, 'p', 'approved', '', expect.objectContaining({ action: 'approved', actorUid: 'client-1' }));
    expect(repositories.commitPostDecision).toHaveBeenNthCalledWith(2, 'p', 'rejected', 'não', expect.objectContaining({ action: 'rejected' }));
    expect(repositories.commitPostDecision).toHaveBeenNthCalledWith(3, 'p', 'changes_requested', 'ajuste', expect.objectContaining({ action: 'changes_requested' }));
  });
  it('Posts valida feedback e registra reenvio administrativo', async () => {
    const client = { actorUid: 'client-1', actorRole: 'client' as const };
    await expect(posts.rejectPost('p', '  ', client)).rejects.toMatchObject({ code: 'feedback-required' });
    expect(repositories.commitPostDecision).not.toHaveBeenCalled();
    repositories.getPostById.mockResolvedValueOnce({ id: 'p', brandId: 'b', status: 'changes_requested' });
    await posts.editPost('p', { caption: 'revisado' }, { actorUid: 'admin-1', actorRole: 'admin' });
    expect(repositories.commitPostDecision).toHaveBeenCalledWith('p', 'pending', '', expect.objectContaining({ action: 'resubmitted', previousStatus: 'changes_requested', actorUid: 'admin-1' }), { caption: 'revisado' });
  });
  it('Invoices, Trash e AgencyConfig delegam', async () => {
    await trash.restoreItem({ id: 't' } as never); await trash.deleteItemPermanently('t'); config.watchAgencyConfig(vi.fn(), vi.fn()); await config.saveAgencyConfig({ name: 'A' } as never);
    expect(repositories.restoreTrashItem).toHaveBeenCalled(); expect(repositories.permanentlyDeleteTrashItem).toHaveBeenCalledWith('t'); expect(repositories.updateAgencyConfig).toHaveBeenCalled();
  });
  it('Métricas calculam indicadores e protegem divisão por zero', async () => {
    await metrics.savePaidMetrics({ brandId: 'b', month: '2026-08', investment: 1000, impressions: 10000, reach: 8000, clicks: 100, leads: 20, conversions: 5, revenue: 3000 });
    expect(repositories.upsertPaidMetrics).toHaveBeenCalledWith(expect.objectContaining({ cpc: 10, cpl: 50, ctr: 1, roas: 3 }));
    await metrics.savePaidMetrics({ brandId: 'b', month: '2026-09', investment: 0, impressions: 0, clicks: 0, leads: 0, conversions: 0, revenue: 0 });
    expect(repositories.upsertPaidMetrics).toHaveBeenLastCalledWith(expect.objectContaining({ cpc: 0, cpl: 0, ctr: 0, roas: 0 }));
  });
});
