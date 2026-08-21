import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({ ref: vi.fn((_storage, path) => ({ path })), uploadBytesResumable: vi.fn(), getDownloadURL: vi.fn(), deleteObject: vi.fn(), getMetadata: vi.fn() }));
vi.mock('firebase/storage', () => sdk);
vi.mock('../lib/firebase', () => ({ storage: {} }));
import { createStorageReference, deleteStoredFile, getFileDownloadUrl, getStorageMetadata, uploadFile } from '../data/repositories/storage.repository';

describe('storage repository', () => {
  beforeEach(() => vi.clearAllMocks());
  it('reporta progresso e conclusão', async () => {
    const reference = { path: 'x' }; const task = { snapshot: { ref: reference }, cancel: vi.fn(), on: vi.fn((_event, progress, _error, complete) => { progress({ bytesTransferred: 5, totalBytes: 10 }); complete(); }) }; sdk.uploadBytesResumable.mockReturnValue(task);
    const onProgress = vi.fn(); const upload = uploadFile(reference as never, new Blob(), { onProgress });
    await expect(upload.completion).resolves.toBe(reference); expect(onProgress).toHaveBeenCalledWith(5, 10); upload.cancel(); expect(task.cancel).toHaveBeenCalled();
  });
  it('normaliza erro e expõe wrappers', async () => {
    const task = { snapshot: {}, cancel: vi.fn(), on: vi.fn((_event, _progress, error) => error(new Error('raw'))) }; sdk.uploadBytesResumable.mockReturnValue(task);
    await expect(uploadFile({} as never, new Blob()).completion).rejects.toMatchObject({ code: 'upload-failed' });
    sdk.getDownloadURL.mockResolvedValue('url'); sdk.deleteObject.mockResolvedValue(undefined); sdk.getMetadata.mockResolvedValue({ size: 1 });
    const ref = createStorageReference('safe/path'); await expect(getFileDownloadUrl(ref)).resolves.toBe('url'); await expect(deleteStoredFile(ref)).resolves.toBeUndefined(); await expect(getStorageMetadata(ref)).resolves.toEqual({ size: 1 });
  });
});
