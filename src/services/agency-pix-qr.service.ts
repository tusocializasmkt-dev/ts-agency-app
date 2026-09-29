import { createStorageReference, getFileDownloadUrl, uploadFile } from '../data/repositories/storage.repository';

export function validatePixQr(file: File): void {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Formato inválido. Use PNG, JPG, JPEG ou WEBP.');
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error('O QR Code deve ter até 5 MB e não pode estar vazio.');
}

export async function uploadAgencyPixQr(file: File, persist: (url: string) => Promise<void>): Promise<string> {
  validatePixQr(file);
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const reference = createStorageReference(`agency/payments/pix-qr/${crypto.randomUUID()}.${extension}`);
  const uploaded = await uploadFile(reference, file).completion;
  const url = await getFileDownloadUrl(uploaded);
  // Never delete the previous QR, or the new object after an ambiguous persistence failure.
  await persist(url);
  return url;
}
