import { beforeEach, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({ createStorageReference: vi.fn((path: string) => ({ path })), getFileDownloadUrl: vi.fn(), uploadFile: vi.fn() }));
vi.mock('../lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({ collection: vi.fn(), doc: vi.fn(), onSnapshot: vi.fn(), setDoc: vi.fn() }));
vi.mock('../data/repositories/storage.repository', () => sdk);
import { uploadBackground } from '../appearance/appearance.service';
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 100, height: 200, close: vi.fn() }));
  sdk.uploadFile.mockImplementation(ref => ({ completion: Promise.resolve(ref) }));
  sdk.getFileDownloadUrl.mockResolvedValue('https://permanent.test/image.png');
});
it('valida MIME, tamanho e imagem decodificável antes de enviar ao Storage', async () => {
  for (const file of [new File(['svg'], 'bad.svg', { type: 'image/svg+xml' }), new File([], 'empty.png', { type: 'image/png' }), new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })]) await expect(uploadBackground(file)).rejects.toThrow('Use PNG');
  vi.mocked(createImageBitmap).mockRejectedValueOnce(new Error('Invalid image'));
  await expect(uploadBackground(new File(['invalid'], 'fake.png', { type: 'image/png' }))).rejects.toThrow('Invalid image');
  expect(sdk.uploadFile).not.toHaveBeenCalled();
});
it('limita pixels e obtém URL permanente só depois de concluir o upload', async () => {
  const close = vi.fn(); vi.mocked(createImageBitmap).mockResolvedValueOnce({ width: 5000, height: 5000, close } as any);
  await expect(uploadBackground(new File(['png'], 'huge.png', { type: 'image/png' }))).rejects.toThrow('16 megapixels');
  expect(close).toHaveBeenCalled(); expect(sdk.uploadFile).not.toHaveBeenCalled();
  await expect(uploadBackground(new File(['png'], 'valid.webp', { type: 'image/webp' }))).resolves.toBe('https://permanent.test/image.png');
  expect(sdk.createStorageReference.mock.calls[0][0]).toMatch(/^agency\/appearance\/[a-f0-9-]+\.webp$/);
});
