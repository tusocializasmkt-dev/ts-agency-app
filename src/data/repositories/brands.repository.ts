import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Brand } from '../../types';
import { normalizeFirestoreError, subscribeToQuery, type DataListener, type ErrorListener } from '../firebase';
import { mapBrand, toBrandWriteData } from '../mappers';

export const subscribeToBrands = (onData: DataListener<Brand[]>, onError: ErrorListener) =>
  subscribeToQuery(collection(db, 'brands'), mapBrand, onData, onError, 'brand', 'subscribe');

export async function getBrandById(id: string): Promise<Brand> {
  try {
    return mapBrand(await getDoc(doc(db, 'brands', id)));
  } catch (error) {
    throw normalizeFirestoreError(error, 'read', 'brand');
  }
}

export async function updateBrand(id: string, data: Partial<Brand>): Promise<void> {
  try {
    await updateDoc(doc(db, 'brands', id), { ...toBrandWriteData(data), updatedAt: serverTimestamp() });
  } catch (error) {
    throw normalizeFirestoreError(error, 'update', 'brand');
  }
}

export async function createBrand(data: Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    return (await addDoc(collection(db, 'brands'), { ...toBrandWriteData(data), createdAt: serverTimestamp(), updatedAt: serverTimestamp() })).id;
  } catch (error) {
    throw normalizeFirestoreError(error, 'create', 'brand');
  }
}

export type ClientEditableBrandFields = Partial<Pick<Brand, 'name' | 'tradeName' | 'segment' | 'description' | 'city' | 'state' | 'responsible' | 'email' | 'phone' | 'whatsapp' | 'website' | 'socialLinks' | 'brandColors' | 'identityNotes' | 'targetAudience' | 'mainOffers' | 'communicationTone' | 'contentNotes' | 'avoidedTerms' | 'references'>>;

export async function updateClientEditableFields(id: string, data: ClientEditableBrandFields): Promise<void> {
  try {
    const allowed = ['name', 'tradeName', 'segment', 'description', 'city', 'state', 'responsible', 'email', 'phone', 'whatsapp', 'website', 'socialLinks', 'brandColors', 'identityNotes', 'targetAudience', 'mainOffers', 'communicationTone', 'contentNotes', 'avoidedTerms', 'references'] as const;
    const safeData = Object.fromEntries(allowed.filter(key => data[key] !== undefined).map(key => [key, data[key]]));
    await updateDoc(doc(db, 'brands', id), safeData);
  } catch (error) {
    throw normalizeFirestoreError(error, 'update-client-profile', 'brand');
  }
}
