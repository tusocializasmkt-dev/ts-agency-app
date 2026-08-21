import type { DocumentData, QueryDocumentSnapshot, Unsubscribe } from 'firebase/firestore';

export type EntityWithId = { id: string };
export type FirestoreRecord<T extends EntityWithId> = Omit<T, 'id'>;
export type SnapshotMapper<T> = (snapshot: QueryDocumentSnapshot<DocumentData>) => T;
export type DataListener<T> = (data: T) => void;
export type ErrorListener = (error: Error) => void;
export type RealtimeSubscription = Unsubscribe;
