import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { createStorageReference, getFileDownloadUrl, uploadFile } from '../data/repositories/storage.repository';
import { isAppearance, type Appearance } from './theme';

export const watchAppearance = (next: (theme: Appearance | null) => void, error: () => void) => onSnapshot(doc(db, 'appearance', 'active'), { includeMetadataChanges: true }, snapshot => {
  if (!snapshot.metadata.hasPendingWrites) next(isAppearance(snapshot.data()) ? snapshot.data() as Appearance : null);
}, error);
export const watchDesigns = (next: (items: { id: string; theme: Appearance }[]) => void, error: () => void) => onSnapshot(collection(db, 'appearance_designs'), snap => next(snap.docs.filter(d => isAppearance(d.data())).map(d => ({ id: d.id, theme: d.data() as Appearance }))), error);
export async function saveAppearance(theme: Appearance, designId?: string) {
  if (!isAppearance(theme)) throw new Error('Configuração visual inválida.');
  await setDoc(doc(db, designId ? 'appearance_designs' : 'appearance', designId || 'active'), theme);
}
export async function uploadBackground(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size === 0 || file.size > 2 * 1024 * 1024) throw new Error('Use PNG, JPG ou WebP com até 2 MB.');
  const bitmap = await createImageBitmap(file);
  const pixels = bitmap.width * bitmap.height;
  bitmap.close();
  if (pixels > 16_000_000) throw new Error('A imagem deve ter no máximo 16 megapixels.');
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const reference = createStorageReference(`agency/appearance/${crypto.randomUUID()}.${ext}`);
  return getFileDownloadUrl(await uploadFile(reference, file).completion);
}
