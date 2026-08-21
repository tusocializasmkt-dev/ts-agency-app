import { collection, doc, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { OrganicMetrics, PaidMetrics } from '../../types';
import { subscribeToQuery, type DataListener, type ErrorListener } from '../firebase';
import { mapOrganicMetrics, mapPaidMetrics } from '../mappers';

export const subscribeToOrganicMetrics = (brandId: string, onData: DataListener<OrganicMetrics[]>, onError: ErrorListener) =>
  subscribeToQuery(query(collection(db, 'metrics_organic'), where('brandId', '==', brandId), orderBy('month', 'asc')), mapOrganicMetrics, onData, onError, 'organic-metrics', 'subscribe');

export const subscribeToPaidMetrics = (brandId: string, onData: DataListener<PaidMetrics[]>, onError: ErrorListener) =>
  subscribeToQuery(query(collection(db, 'metrics_paid'), where('brandId', '==', brandId), orderBy('month', 'asc')), mapPaidMetrics, onData, onError, 'paid-metrics', 'subscribe');

const metricId = (brandId: string, month: string) => `${brandId}_${month}`;
export const upsertOrganicMetrics = (data: Omit<OrganicMetrics, 'id' | 'createdAt' | 'updatedAt'>) => setDoc(doc(db, 'metrics_organic', metricId(data.brandId, data.month)), { ...data, updatedAt: serverTimestamp() }, { merge: true });
export const upsertPaidMetrics = (data: Omit<PaidMetrics, 'id' | 'createdAt' | 'updatedAt'>) => setDoc(doc(db, 'metrics_paid', metricId(data.brandId, data.month)), { ...data, updatedAt: serverTimestamp() }, { merge: true });
