import { Timestamp, type DocumentData, type DocumentSnapshot, type FieldValue } from 'firebase/firestore';
import type { PostDecisionHistory } from '../../types';
import { removeUndefined } from '../firebase';

const toDate = (value: unknown): Date | undefined => value instanceof Date ? value : value instanceof Timestamp ? value.toDate() : value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function' ? value.toDate() : undefined;

export function mapPostHistory(snapshot: DocumentSnapshot<DocumentData>): PostDecisionHistory {
  const data = snapshot.data(); if (!data) throw new Error('Post history document has no data.');
  return { ...data, id: snapshot.id, createdAt: toDate(data.createdAt) } as PostDecisionHistory;
}

export function toPostHistoryWriteData(data: Omit<PostDecisionHistory, 'id' | 'createdAt'> & { id?: string; createdAt?: Date | FieldValue }): Record<string, unknown> {
  const { id: _id, ...record } = data; return removeUndefined(record);
}
