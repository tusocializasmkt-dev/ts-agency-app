import { beforeEach, expect, it, vi } from 'vitest';
import { FirebaseError } from 'firebase/app';
const db = vi.hoisted(() => ({ databaseId: 'ai-studio-983a0c74-a073-4755-af2a-6e8c97248d58' }));
const sdk = vi.hoisted(() => ({ doc: vi.fn((db, collection, id) => ({ db, collection, id })), onSnapshot: vi.fn(), updateDoc: vi.fn(), setDoc: vi.fn() }));
const storage = vi.hoisted(() => ({ createStorageReference: vi.fn((path: string) => ({ path })), uploadFile: vi.fn(), getFileDownloadUrl: vi.fn(), deleteStoredFile: vi.fn() }));
vi.mock('../lib/firebase', () => ({ db }));
vi.mock('firebase/firestore', () => sdk);
vi.mock('../data/repositories/storage.repository', () => storage);
import { subscribeToAgencyConfig, updateAgencyConfig, updateAgencyLogoUrl } from '../data/repositories/agency-config.repository';
import { uploadAgencyLogo } from '../services/agency-logo.service';
beforeEach(() => {
  vi.resetAllMocks();
  sdk.updateDoc.mockResolvedValue(undefined); sdk.setDoc.mockResolvedValue(undefined);
  storage.uploadFile.mockImplementation(reference => ({ completion: Promise.resolve(reference) }));
  storage.getFileDownloadUrl.mockResolvedValue('https://logo.test/new.png');
  storage.deleteStoredFile.mockResolvedValue(undefined);
  storage.createStorageReference.mockImplementation(path => ({ path }));
});
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

it('mescla somente logoUrl no documento canônico do banco nomeado, criando-o se necessário', async () => {
  await updateAgencyLogoUrl('https://logo.test/new.png');
  expect(sdk.setDoc).toHaveBeenCalledWith({ db, collection: 'agency_config', id: 'default' }, { logoUrl: 'https://logo.test/new.png' }, { merge: true });
  expect(sdk.updateDoc).not.toHaveBeenCalled();
});

it('regressão: documento ausente não causa persist/not-found nem limpeza após upload bem-sucedido', async () => {
  // updateDoc would reject this first upload when agency_config/default is absent.
  sdk.updateDoc.mockRejectedValue(new FirebaseError('not-found', 'No document to update'));
  const file = new File(['png'], 'logo.png', { type: 'image/png' });
  await expect(uploadAgencyLogo(file, updateAgencyLogoUrl)).resolves.toBe('https://logo.test/new.png');
  expect(sdk.setDoc).toHaveBeenCalledWith({ db, collection: 'agency_config', id: 'default' }, { logoUrl: 'https://logo.test/new.png' }, { merge: true });
  expect(sdk.updateDoc).not.toHaveBeenCalled();
  expect(storage.deleteStoredFile).not.toHaveBeenCalled();
});

it('aguarda confirmação da persistência antes de concluir e não limpa arquivo enquanto aguarda', async () => {
  let confirm!: () => void;
  sdk.setDoc.mockReturnValueOnce(new Promise<void>(resolve => { confirm = resolve; }));
  const finished = vi.fn();
  const operation = uploadAgencyLogo(new File(['png'], 'logo.png', { type: 'image/png' }), updateAgencyLogoUrl).then(finished);
  await vi.waitFor(() => expect(sdk.setDoc).toHaveBeenCalled());
  expect(finished).not.toHaveBeenCalled();
  expect(storage.deleteStoredFile).not.toHaveBeenCalled();
  confirm(); await operation;
  expect(finished).toHaveBeenCalledWith('https://logo.test/new.png');
});

it('rejeição definitiva da gravação limpa só o arquivo desta tentativa', async () => {
  sdk.setDoc.mockRejectedValueOnce(new FirebaseError('permission-denied', 'Denied'));
  await expect(uploadAgencyLogo(new File(['png'], 'logo.png', { type: 'image/png' }), updateAgencyLogoUrl)).rejects.toMatchObject({ stage: 'persist', code: 'permission-denied', cleanup: 'removed' });
  expect(storage.deleteStoredFile).toHaveBeenCalledExactlyOnceWith(storage.createStorageReference.mock.results[0].value);
});

it('erro ambíguo não apaga arquivo que pode ter sido confirmado no servidor', async () => {
  sdk.setDoc.mockRejectedValueOnce(new FirebaseError('unavailable', 'Network failure'));
  await expect(uploadAgencyLogo(new File(['png'], 'logo.png', { type: 'image/png' }), updateAgencyLogoUrl)).rejects.toMatchObject({ stage: 'persist', code: 'unavailable', cleanup: 'retained' });
  expect(storage.deleteStoredFile).not.toHaveBeenCalled();
});

it('not-found da própria escrita permanece explícito sem fallback para outro banco/documento', async () => {
  sdk.setDoc.mockRejectedValueOnce(new FirebaseError('not-found', 'Database missing'));
  await expect(updateAgencyLogoUrl('https://logo.test/new.png')).rejects.toMatchObject({ code: 'not-found', operation: 'update', entity: 'agency-config' });
  expect(sdk.setDoc).toHaveBeenCalledTimes(1);
  expect(sdk.doc).not.toHaveBeenCalled();
});
