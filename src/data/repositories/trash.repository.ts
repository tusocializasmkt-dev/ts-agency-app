import { collection, deleteDoc, doc, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { TrashItem } from '../../types';
import { normalizeFirestoreError, subscribeToQuery, type DataListener, type ErrorListener } from '../firebase';
import { mapTrashItem, toRestoredPostWriteData } from '../mappers';

export const subscribeToTrash = (onData: DataListener<TrashItem[]>, onError: ErrorListener) =>
  subscribeToQuery(query(collection(db, 'trash_items'), orderBy('scheduledDate', 'desc')), mapTrashItem, onData, onError, 'trash-item', 'subscribe');

export async function restoreTrashItem(item: TrashItem): Promise<void> {
  try {
    const batch = writeBatch(db); batch.set(doc(db, 'posts', item.id), { ...toRestoredPostWriteData(item), updatedAt: serverTimestamp() }); batch.delete(doc(db, 'trash_items', item.id)); await batch.commit();
  } catch (error) {
    throw normalizeFirestoreError(error, 'restore', 'trash-item');
  }
}

export async function permanentlyDeleteTrashItem(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'trash_items', id));
  } catch (error) {
    throw normalizeFirestoreError(error, 'delete', 'trash-item');
  }
}
