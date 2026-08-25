import { addDoc, collection, deleteField, doc, getDoc, orderBy, query, serverTimestamp, updateDoc, where, writeBatch, type DocumentData, type Query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Post, PostStatus } from '../../types';
import { normalizeFirestoreError, subscribeToQuery, type DataListener, type ErrorListener } from '../firebase';
import { mapPost, toPostWriteData } from '../mappers';
import { getLocalMonthIsoRange } from '../../posts';

const posts = collection(db, 'posts');

export async function getPostById(id: string): Promise<Post | null> { try { const snapshot = await getDoc(doc(db, 'posts', id)); return snapshot.exists() ? mapPost(snapshot) : null; } catch (error) { throw normalizeFirestoreError(error, 'get', 'post'); } }

export const subscribeToPosts = (onData: DataListener<Post[]>, onError: ErrorListener, status?: PostStatus) => {
  const source = status ? query(posts, where('status', '==', status), orderBy('scheduledDate', 'desc')) : query(posts, orderBy('scheduledDate', 'desc'));
  return subscribeToQuery(source, mapPost, onData, onError, 'post', 'subscribe');
};

export const subscribeToPostsByBrand = (brandId: string, onData: DataListener<Post[]>, onError: ErrorListener, status?: PostStatus) => {
  let source: Query<DocumentData> = query(posts, where('brandId', '==', brandId), orderBy('scheduledDate', 'desc'));
  if (status) source = query(posts, where('brandId', '==', brandId), where('status', '==', status), orderBy('scheduledDate', 'desc'));
  return subscribeToQuery(source, mapPost, onData, onError, 'post', 'subscribe-by-brand');
};

export const subscribeToPostsByMonth = (brandId: string | null, month: string, onData: DataListener<Post[]>, onError: ErrorListener) => {
  const { start, end } = getLocalMonthIsoRange(month);
  let source: Query<DocumentData> = query(posts, where('scheduledDate', '>=', start), where('scheduledDate', '<', end), orderBy('scheduledDate', 'asc'));
  if (brandId) source = query(posts, where('brandId', '==', brandId), where('scheduledDate', '>=', start), where('scheduledDate', '<', end), orderBy('scheduledDate', 'asc'));
  return subscribeToQuery(source, mapPost, onData, onError, 'post', 'subscribe-by-month');
};

export async function createPost(data: Partial<Post>): Promise<string> {
  try {
    return (await addDoc(posts, { ...toPostWriteData(data), createdAt: serverTimestamp(), updatedAt: serverTimestamp() })).id;
  } catch (error) {
    throw normalizeFirestoreError(error, 'create', 'post');
  }
}

export async function updatePost(id: string, data: Partial<Post>): Promise<void> {
  try {
    const mediaCleanup = Array.isArray(data.mediaIds) && !data.coverMediaId ? { coverMediaId: deleteField() } : {};
    await updateDoc(doc(db, 'posts', id), { ...toPostWriteData(data), ...mediaCleanup, updatedAt: serverTimestamp() });
  } catch (error) {
    throw normalizeFirestoreError(error, 'update', 'post');
  }
}

export async function movePostToTrash(id: string): Promise<void> {
  try { const source = doc(db, 'posts', id); const snapshot = await getDoc(source); if (!snapshot.exists()) throw new Error('post-not-found'); const batch = writeBatch(db); batch.set(doc(db, 'trash_items', id), { ...snapshot.data(), sourceCollection: 'posts', deletedAt: serverTimestamp() }); batch.delete(source); await batch.commit(); }
  catch (error) { throw normalizeFirestoreError(error, 'trash', 'post'); }
}

export async function updatePostStatus(id: string, status: PostStatus, feedback = ''): Promise<void> {
  try {
    await updateDoc(doc(db, 'posts', id), { status, feedback });
  } catch (error) {
    throw normalizeFirestoreError(error, 'update-status', 'post');
  }
}
