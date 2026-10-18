import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db } from '../lib/firebase';
import { createStorageReference, getFileDownloadUrl, uploadFile } from '../data/repositories/storage.repository';
export interface CommunicationDraft { id: string; title: string; message: string; image: string; popup: boolean; audience: 'all' | 'selected'; recipients: string[]; action: 'draft' | 'send' | 'schedule'; scheduledAt: number | null; revision: number }
export interface CommunicationRecord extends Omit<CommunicationDraft, 'scheduledAt'> { status: string; scheduledAt?: { toDate(): Date }; delivered?: number }
export const manageCommunication = async (input: CommunicationDraft) => {
  const { functionsClient } = await import('../data/functions/client');
  return (await httpsCallable<CommunicationDraft, { revision: number; status: string }>(functionsClient, 'manageCommunication')(input)).data;
};
export const watchCommunications = (next: (items: CommunicationRecord[]) => void, error: () => void) => onSnapshot(query(collection(db, 'communications'), orderBy('updatedAt', 'desc'), limit(100)), snapshot => next(snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as CommunicationRecord)), error);
export const watchPopups = (uid: string, next: (items: import('../types').Notification[]) => void, error: () => void) => onSnapshot(query(collection(db, 'notifications'), where('recipientUid', '==', uid), where('type', '==', 'communication'), where('popup', '==', true), where('popupDismissedAt', '==', null), orderBy('createdAt', 'asc'), limit(10)), snapshot => next(snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as import('../types').Notification)), error);
export const dismissPopup = (id: string) => updateDoc(doc(db, 'notifications', id), { popupDismissedAt: serverTimestamp() });
export async function uploadCommunicationImage(file: File) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !file.size || file.size > 2 * 1024 * 1024) throw new Error('Use PNG, JPG ou WebP com até 2 MB.');
  const bitmap = await createImageBitmap(file); const pixels = bitmap.width * bitmap.height; bitmap.close();
  if (pixels > 16_000_000) throw new Error('Use imagens com até 16 megapixels.');
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  return getFileDownloadUrl(await uploadFile(createStorageReference(`agency/communications/${crypto.randomUUID()}.${ext}`), file).completion);
}
