import { beforeEach, expect, it, vi } from 'vitest';
import { FirebaseError } from 'firebase/app';
const db = vi.hoisted(() => ({ databaseId: 'ai-studio-983a0c74-a073-4755-af2a-6e8c97248d58' }));
const sdk = vi.hoisted(() => ({ doc: vi.fn((db, collection, id) => ({ db, collection, id })), onSnapshot: vi.fn(), updateDoc: vi.fn() }));
vi.mock('../lib/firebase', () => ({ db }));
vi.mock('firebase/firestore', () => sdk);
import { subscribeToAgencyConfig, updateAgencyConfig } from '../data/repositories/agency-config.repository';
beforeEach(() => { vi.clearAllMocks(); sdk.updateDoc.mockResolvedValue(undefined); });
it('grava configuração no documento default da instância db compartilhada', async () => {
  await updateAgencyConfig({ name: 'Agência', logoUrl: 'https://example.test/logo.png', phone: '', email: '', socialLinks: {} });
  expect(sdk.updateDoc).toHaveBeenCalledWith({ db, collection: 'agency_config', id: 'default' }, expect.objectContaining({ logoUrl: 'https://example.test/logo.png' }));
});
it('preserva código de falha após upload para diagnóstico por etapa', async () => {
  sdk.updateDoc.mockRejectedValueOnce(new FirebaseError('not-found', 'Document missing'));
  await expect(updateAgencyConfig({ logoUrl: 'https://example.test/new.png' } as never)).rejects.toMatchObject({ code: 'not-found', operation: 'update', entity: 'agency-config' });
});
it('não publica logo otimista enquanto escrita ainda pode ser rejeitada', () => {
  const onData = vi.fn(); subscribeToAgencyConfig(onData, vi.fn());
  expect(sdk.onSnapshot.mock.calls[0][1]).toEqual({ includeMetadataChanges: true });
  const next = sdk.onSnapshot.mock.calls[0][2];
  next({ metadata: { hasPendingWrites: true }, data: () => ({ logoUrl: 'pending' }) }); expect(onData).not.toHaveBeenCalled();
  next({ metadata: { hasPendingWrites: false }, data: () => ({ logoUrl: 'committed' }) }); expect(onData).toHaveBeenCalledWith({ logoUrl: 'committed' });
});
