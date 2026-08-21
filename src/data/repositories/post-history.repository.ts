import { addDoc, collection, doc, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Post, PostDecisionHistory, PostStatus } from '../../types';
import { normalizeFirestoreError, subscribeToQuery, type DataListener, type ErrorListener } from '../firebase';
import { mapPostHistory, toPostHistoryWriteData, toPostWriteData } from '../mappers';

type NewHistoryEntry = Omit<PostDecisionHistory, 'id' | 'createdAt'>;
const historyCollection = (postId: string) => collection(db, 'posts', postId, 'history');

export function subscribeToPostHistory(postId: string, onData: DataListener<PostDecisionHistory[]>, onError: ErrorListener) {
  return subscribeToQuery(query(historyCollection(postId), orderBy('createdAt', 'desc')), mapPostHistory, onData, onError, 'post-history', 'subscribe');
}

export async function createPostHistoryEntry(entry: NewHistoryEntry): Promise<string> {
  try { const created = await addDoc(historyCollection(entry.postId), { ...toPostHistoryWriteData(entry), createdAt: serverTimestamp() }); return created.id; }
  catch (error) { throw normalizeFirestoreError(error, 'create', 'post-history'); }
}

export async function commitPostDecision(postId: string, status: PostStatus, feedback: string, entry: NewHistoryEntry, postChanges: Partial<Post> = {}): Promise<void> {
  try {
    const batch = writeBatch(db); const historyRef = doc(historyCollection(postId));
    batch.update(doc(db, 'posts', postId), { ...toPostWriteData(postChanges), status, feedback, updatedAt: serverTimestamp() });
    batch.set(historyRef, { ...toPostHistoryWriteData(entry), createdAt: serverTimestamp() });
    await batch.commit();
  } catch (error) { throw normalizeFirestoreError(error, 'commit-decision', 'post-history'); }
}
