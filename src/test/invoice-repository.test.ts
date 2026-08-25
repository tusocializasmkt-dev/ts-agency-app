import { beforeEach, describe, expect, it, vi } from 'vitest';

const firebase = vi.hoisted(() => {
  const batch = { set: vi.fn(), update: vi.fn(), commit: vi.fn() };
  return {
    batch,
    collection: vi.fn((...parts: unknown[]) => `collection:${parts.slice(1).join('/')}`),
    doc: vi.fn((...parts: unknown[]) => parts.length === 1 ? { id: 'new-invoice' } : parts.length === 2 && typeof parts[1] === 'string' && String(parts[0]).startsWith('collection:') ? { id: 'new-history' } : `doc:${parts.slice(1).join('/')}`),
    getDoc: vi.fn(), query: vi.fn((...parts: unknown[]) => parts), where: vi.fn((...parts: unknown[]) => parts), orderBy: vi.fn((...parts: unknown[]) => parts),
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'), deleteField: vi.fn(() => 'DELETE_FIELD'), updateDoc: vi.fn(), writeBatch: vi.fn(() => batch),
  };
});

vi.mock('firebase/firestore', () => firebase);
vi.mock('../lib/firebase', () => ({ db: {} }));
vi.mock('../data/firebase', () => ({
  normalizeFirestoreError: vi.fn((error: unknown) => error),
  subscribeToQuery: vi.fn(() => vi.fn()),
  removeUndefined: (record: Record<string, unknown>) => Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)),
}));

import { cancelInvoice, createInvoice, createInvoiceSeries, markInvoicePaid, replaceInvoiceBoleto, resumeInvoice, subscribeToInvoiceHistory, suspendInvoice, updateInvoice } from '../data/repositories/invoices.repository';

const history = { invoiceId: 'i', brandId: 'b', action: 'edited' as const, actorUid: 'admin', actorRole: 'admin' as const };

describe('invoices repository', () => {
  beforeEach(() => { vi.clearAllMocks(); firebase.batch.commit.mockResolvedValue(undefined); });

  it('cria fatura e histórico no mesmo batch sem persistir id', async () => {
    await expect(createInvoice({ brandId: 'b', description: 'Mensalidade', amount: 100, currency: 'BRL', originalDueDate: '2026-08-10', dueDate: '2026-08-10', status: 'pending', createdBy: 'admin' }, { ...history, invoiceId: '', action: 'created' })).resolves.toBe('new-invoice');
    expect(firebase.batch.set).toHaveBeenCalledTimes(2);
    expect(firebase.batch.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ brandId: 'b', status: 'pending', createdAt: 'SERVER_TIMESTAMP', updatedAt: 'SERVER_TIMESTAMP' }));
    expect(firebase.batch.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ invoiceId: 'new-invoice', action: 'created', createdAt: 'SERVER_TIMESTAMP' }));
    expect(firebase.batch.commit).toHaveBeenCalledOnce();
  });

  it('edita e executa transições com histórico imutável em batch', async () => {
    await updateInvoice('i', { amount: 120, pixKey: undefined, pixLink: undefined }, history);
    await markInvoicePaid('i', { ...history, action: 'marked_paid' });
    await suspendInvoice('i', { ...history, action: 'suspended' });
    await resumeInvoice('i', { ...history, action: 'resumed' });
    await cancelInvoice('i', { ...history, action: 'cancelled' });
    expect(firebase.batch.commit).toHaveBeenCalledTimes(5);
    expect(firebase.batch.update).toHaveBeenCalledWith('doc:invoices/i', expect.objectContaining({ amount: 120, pixKey: 'DELETE_FIELD', pixLink: 'DELETE_FIELD' }));
    expect(firebase.batch.update).toHaveBeenCalledWith('doc:invoices/i', expect.objectContaining({ status: 'paid', paidAt: 'SERVER_TIMESTAMP' }));
    expect(firebase.batch.update).toHaveBeenCalledWith('doc:invoices/i', expect.objectContaining({ status: 'suspended', suspendedAt: 'SERVER_TIMESTAMP' }));
    expect(firebase.batch.update).toHaveBeenCalledWith('doc:invoices/i', expect.objectContaining({ status: 'pending', suspendedAt: 'DELETE_FIELD' }));
    expect(firebase.batch.update).toHaveBeenCalledWith('doc:invoices/i', expect.objectContaining({ status: 'cancelled', cancelledAt: 'SERVER_TIMESTAMP' }));
  });

  it('associa boleto e carrega histórico sob demanda', async () => {
    const unsubscribe = subscribeToInvoiceHistory('i', vi.fn(), vi.fn());
    await replaceInvoiceBoleto('i', 'media-pdf', { ...history, action: 'boleto_replaced' });
    expect(unsubscribe).toEqual(expect.any(Function));
    expect(firebase.batch.update).toHaveBeenCalledWith('doc:invoices/i', expect.objectContaining({ boletoMediaId: 'media-pdf' }));
  });
  it('usa um único batch e não confirma uma série parcial quando o commit falha', async () => {
    firebase.batch.commit.mockRejectedValueOnce(new Error('falha-atômica'));
    const entry = { invoice: { brandId: 'b', amount: 100, currency: 'BRL' as const, dueDate: '2026-09-10', status: 'pending' as const, createdBy: 'admin' }, history: { ...history, invoiceId: '', action: 'created' as const } };
    await expect(createInvoiceSeries([entry, { ...entry, invoice: { ...entry.invoice, dueDate: '2026-10-10' } }])).rejects.toThrow('falha-atômica');
    expect(firebase.writeBatch).toHaveBeenCalledOnce(); expect(firebase.batch.set).toHaveBeenCalledTimes(4); expect(firebase.batch.commit).toHaveBeenCalledOnce();
  });
});
