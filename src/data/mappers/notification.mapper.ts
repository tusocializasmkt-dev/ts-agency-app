import { Timestamp, type DocumentData, type DocumentSnapshot, type FieldValue } from 'firebase/firestore';
import type { Notification } from '../../types';
import { removeUndefined } from '../firebase';

const toDate = (value: unknown): Date | undefined => value instanceof Date ? value : value instanceof Timestamp ? value.toDate() : value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function' ? value.toDate() : undefined;
export function mapNotification(snapshot: DocumentSnapshot<DocumentData>): Notification { const data = snapshot.data(); if (!data) throw new Error('Notification document has no data.'); return { ...data, id: snapshot.id, createdAt: toDate(data.createdAt), readAt: toDate(data.readAt) } as Notification; }
export function toNotificationWriteData(data: Omit<Notification, 'id' | 'createdAt' | 'readAt'> & { id?: string; createdAt?: Date | FieldValue; readAt?: Date | FieldValue }): Record<string, unknown> { const { id: _id, ...record } = data; return removeUndefined(record); }
