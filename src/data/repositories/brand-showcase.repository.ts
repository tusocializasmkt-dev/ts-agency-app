import { collection, query, where, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { BrandShowcaseItem } from '../../types';
import { normalizeFirestoreError, subscribeToQuery, type DataListener, type ErrorListener } from '../firebase';

function mapBrandShowcase(snapshot: QueryDocumentSnapshot<DocumentData>): BrandShowcaseItem {
  const data = snapshot.data();
  const displayName = typeof data.displayName === 'string' ? data.displayName.trim() : '';
  if (!displayName) throw new Error('Invalid brand showcase item.');
  const logoUrl = typeof data.logoUrl === 'string' && data.logoUrl.trim() ? data.logoUrl.trim() : undefined;
  return { id: snapshot.id, displayName, ...(logoUrl ? { logoUrl } : {}) };
}

export const subscribeToBrandShowcase = (onData: DataListener<BrandShowcaseItem[]>, onError: ErrorListener) =>
  subscribeToQuery(query(collection(db, 'brand_showcase'), where('visible', '==', true)), mapBrandShowcase, items => onData([...items].sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'))), error => onError(normalizeFirestoreError(error, 'subscribe', 'brand-showcase')), 'brand-showcase', 'subscribe');
