import { collection, deleteDoc, doc, documentId, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, startAfter, updateDoc, where, type QueryConstraint } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MEDIA_LIBRARY_PAGE_SIZE, type MediaAsset, type MediaLibraryFilters, type MediaPage, type MediaPageRequest } from '../../media';
import { normalizeFirestoreError, subscribeToQuery, type DataListener, type ErrorListener } from '../firebase';
import { mapMedia, toMediaWriteData } from '../mappers';

const media = collection(db, 'media');
const MEDIA_QUERY_LIMIT = 100;
const FIRESTORE_IN_LIMIT = 10;

export async function getMediaByIds(ids: readonly string[]): Promise<MediaAsset[]> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return [];
  try {
    const chunks = Array.from({ length: Math.ceil(uniqueIds.length / FIRESTORE_IN_LIMIT) }, (_, index) => uniqueIds.slice(index * FIRESTORE_IN_LIMIT, (index + 1) * FIRESTORE_IN_LIMIT));
    const snapshots = await Promise.all(chunks.map(chunk => getDocs(query(media, where(documentId(), 'in', chunk)))));
    return snapshots.flatMap(snapshot => snapshot.docs.map(mapMedia));
  } catch (error) { throw normalizeFirestoreError(error, 'get-by-ids', 'media'); }
}

export async function listMediaPage(request: MediaPageRequest = {}): Promise<MediaPage> {
  const pageSize = Math.max(1, Math.min(request.pageSize ?? MEDIA_LIBRARY_PAGE_SIZE, MEDIA_LIBRARY_PAGE_SIZE));
  try {
    const constraints: QueryConstraint[] = [];
    if (request.brandId && request.brandIds && !request.brandIds.includes(request.brandId)) return { items: [], hasMore: false };
    if (request.brandId) constraints.push(where('brandId', '==', request.brandId));
    else if (request.brandIds) { if (!request.brandIds.length) return { items: [], hasMore: false }; constraints.push(where('brandId', 'in', request.brandIds.slice(0, 30))); }
    if (request.type) constraints.push(where('mediaType', '==', request.type));
    if (request.status) constraints.push(where('status', '==', request.status));
    constraints.push(orderBy('createdAt', request.order === 'oldest' ? 'asc' : 'desc'));
    if (request.cursor) {
      const cursorSnapshot = await getDoc(doc(db, 'media', request.cursor));
      if (cursorSnapshot.exists()) constraints.push(startAfter(cursorSnapshot));
    }
    constraints.push(limit(pageSize + 1));
    const snapshot = await getDocs(query(media, ...constraints));
    const hasMore = snapshot.docs.length > pageSize;
    const visibleDocs = snapshot.docs.slice(0, pageSize);
    return { items: visibleDocs.map(mapMedia), nextCursor: hasMore ? visibleDocs.at(-1)?.id : undefined, hasMore };
  } catch (error) { throw normalizeFirestoreError(error, 'list-page', 'media'); }
}

export function subscribeToMediaByBrand(brandId: string, onData: DataListener<MediaAsset[]>, onError: ErrorListener, filters: MediaLibraryFilters = {}) {
  let source = query(media, where('brandId', '==', brandId), orderBy('createdAt', 'desc'), limit(MEDIA_QUERY_LIMIT));
  if (filters.status) source = query(media, where('brandId', '==', brandId), where('status', '==', filters.status), orderBy('createdAt', 'desc'), limit(MEDIA_QUERY_LIMIT));
  return subscribeToQuery(source, mapMedia, onData, onError, 'media', 'subscribe-by-brand');
}

export async function getMediaById(brandId: string, id: string): Promise<MediaAsset | null> {
  try { const snapshot = await getDoc(doc(db, 'media', id)); const asset = snapshot.exists() ? mapMedia(snapshot) : null; return asset?.brandId === brandId ? asset : null; }
  catch (error) { throw normalizeFirestoreError(error, 'get', 'media'); }
}

export async function createMediaRecord(data: Omit<MediaAsset, 'id' | 'createdAt' | 'updatedAt'>, id?: string): Promise<string> {
  try { const reference = id ? doc(db, 'media', id) : doc(media); await setDoc(reference, { ...toMediaWriteData(data), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); return reference.id; }
  catch (error) { throw normalizeFirestoreError(error, 'create', 'media'); }
}

export async function updateMediaMetadata(brandId: string, id: string, data: Partial<MediaAsset>): Promise<void> {
  try { await updateDoc(doc(db, 'media', id), { ...toMediaWriteData({ ...data, brandId }), updatedAt: serverTimestamp() }); }
  catch (error) { throw normalizeFirestoreError(error, 'update', 'media'); }
}

export const markMediaDeleted = (brandId: string, id: string) => updateMediaMetadata(brandId, id, { status: 'deleted', deletedAt: serverTimestamp() } as never);
export const restoreMedia = (brandId: string, id: string) => updateMediaMetadata(brandId, id, { status: 'ready', deletedAt: null } as never);

export async function permanentlyDeleteMediaRecord(brandId: string, id: string): Promise<void> {
  try { const asset = await getMediaById(brandId, id); if (!asset) return; await deleteDoc(doc(db, 'media', id)); }
  catch (error) { throw normalizeFirestoreError(error, 'delete', 'media'); }
}
