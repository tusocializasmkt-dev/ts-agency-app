import { onSnapshot, type DocumentData, type Query } from 'firebase/firestore';
import { normalizeFirestoreError } from './firestore.errors';
import type { DataListener, ErrorListener, RealtimeSubscription, SnapshotMapper } from './firestore.types';

export function removeUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as Partial<T>;
}

export function subscribeToQuery<T>(
  source: Query<DocumentData>,
  mapper: SnapshotMapper<T>,
  onData: DataListener<T[]>,
  onError: ErrorListener,
  entity: string,
  operation: string,
): RealtimeSubscription {
  return onSnapshot(
    source,
    snapshot => {
      try {
        onData(snapshot.docs.map(mapper));
      } catch (error) {
        onError(normalizeFirestoreError(error, operation, entity));
      }
    },
    error => onError(normalizeFirestoreError(error, operation, entity)),
  );
}
