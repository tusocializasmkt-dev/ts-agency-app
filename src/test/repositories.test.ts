import { beforeEach, describe, expect, it, vi } from 'vitest';

const batch = vi.hoisted(() => ({ set: vi.fn(), delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) }));
const sdk = vi.hoisted(() => ({ writeBatch: vi.fn(() => batch), collection: vi.fn((_db, path) => `collection:${path}`), doc: vi.fn((_db, path, id) => `doc:${path}/${id}`), query: vi.fn((...args) => args), where: vi.fn((...args) => ['where', ...args]), orderBy: vi.fn((...args) => ['orderBy', ...args]), updateDoc: vi.fn(), addDoc: vi.fn(), deleteDoc: vi.fn(), deleteField: vi.fn(() => 'DELETE_FIELD'), getDoc: vi.fn(), onSnapshot: vi.fn(() => vi.fn()), serverTimestamp: vi.fn(() => 'SERVER_TIME') }));
const data = vi.hoisted(() => ({ subscribeToQuery: vi.fn(() => vi.fn()), normalizeFirestoreError: vi.fn(() => new Error('normalizado')), removeUndefined: (record: Record<string, unknown>) => Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)) }));
vi.mock('firebase/firestore', () => sdk);
vi.mock('../lib/firebase', () => ({ db: {} }));
vi.mock('../data/firebase', () => data);

import { subscribeToBrands, updateBrand, updateClientEditableFields } from '../data/repositories/brands.repository';
import { createPost, subscribeToPostsByBrand, updatePost, updatePostStatus } from '../data/repositories/posts.repository';
import { subscribeToInvoicesByBrand } from '../data/repositories/invoices.repository';
import { permanentlyDeleteTrashItem, restoreTrashItem } from '../data/repositories/trash.repository';
import { subscribeToAgencyConfig, updateAgencyConfig } from '../data/repositories/agency-config.repository';

describe('repositories sem Firebase real', () => {
  beforeEach(() => { vi.clearAllMocks(); sdk.updateDoc.mockReset().mockResolvedValue(undefined); sdk.addDoc.mockReset().mockResolvedValue({ id: 'created' }); sdk.deleteDoc.mockReset().mockResolvedValue(undefined); });
  it('constrói coleções, filtros e retorna unsubscribe', () => {
    const unsubscribe = vi.fn(); data.subscribeToQuery.mockReturnValueOnce(unsubscribe);
    expect(subscribeToBrands(vi.fn(), vi.fn())).toBe(unsubscribe); subscribeToPostsByBrand('b', vi.fn(), vi.fn(), 'approved'); subscribeToInvoicesByBrand('b', vi.fn(), vi.fn(), 'pending');
    expect(sdk.where).toHaveBeenCalledWith('brandId', '==', 'b'); expect(sdk.where).toHaveBeenCalledWith('status', '==', 'approved'); expect(sdk.where).toHaveBeenCalledWith('status', '==', 'pending');
  });
  it('não persiste id/undefined e separa campos permitidos ao cliente', async () => {
    await updateBrand('b', { id: 'b', name: 'B', phone: undefined }); await updateClientEditableFields('b', { responsible: 'R', phone: '1', website: 'w' }); await createPost({ id: 'p', brandId: 'b', caption: undefined }); await updatePostStatus('p', 'approved');
    expect(sdk.updateDoc).toHaveBeenNthCalledWith(1, 'doc:brands/b', { name: 'B', updatedAt: 'SERVER_TIME' });
    expect(sdk.updateDoc).toHaveBeenNthCalledWith(2, 'doc:brands/b', { responsible: 'R', phone: '1', website: 'w' });
    expect(sdk.addDoc).toHaveBeenCalledWith('collection:posts', { brandId: 'b', createdAt: 'SERVER_TIME', updatedAt: 'SERVER_TIME' });
    expect(sdk.updateDoc).toHaveBeenNthCalledWith(3, 'doc:posts/p', { status: 'approved', feedback: '' });
  });
  it('atualiza fatura, restaura/exclui lixeira e configura agência', async () => {
    await restoreTrashItem({ id: 't', sourceCollection: 'posts', deletedAt: 'x', brandId: 'b' } as never); await permanentlyDeleteTrashItem('t'); await updateAgencyConfig({ name: 'A', phone: undefined } as never);
    expect(batch.set).toHaveBeenCalledWith('doc:posts/t', expect.not.objectContaining({ id: expect.anything(), deletedAt: expect.anything() })); expect(batch.delete).toHaveBeenCalledWith('doc:trash_items/t');
  });
  it('normaliza erros de escrita e subscription de config retorna cleanup', async () => {
    sdk.updateDoc.mockRejectedValueOnce(new Error('firebase')); await expect(updatePostStatus('p', 'rejected')).rejects.toThrow('normalizado'); expect(data.normalizeFirestoreError).toHaveBeenCalledWith(expect.any(Error), 'update-status', 'post'); const unsubscribe = vi.fn(); sdk.onSnapshot.mockReturnValueOnce(unsubscribe); expect(subscribeToAgencyConfig(vi.fn(), vi.fn())).toBe(unsubscribe);
  });
  it('remove capa antiga ao esvaziar mediaIds', async () => { await updatePost('p', { mediaIds: [], coverMediaId: undefined }); expect(sdk.updateDoc).toHaveBeenCalledWith('doc:posts/p', { mediaIds: [], coverMediaId: 'DELETE_FIELD', updatedAt: 'SERVER_TIME' }); });
});
