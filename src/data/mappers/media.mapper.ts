import { Timestamp, type DocumentData, type DocumentSnapshot, type FieldValue } from 'firebase/firestore';
import type { MediaAsset } from '../../media';
import { removeUndefined } from '../firebase';

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate();
  return undefined;
}

export function mapMedia(snapshot: DocumentSnapshot<DocumentData>): MediaAsset {
  const data = snapshot.data();
  if (!data) throw new Error('Media document has no data.');
  return { ...data, id: snapshot.id, createdAt: toDate(data.createdAt), updatedAt: toDate(data.updatedAt), deletedAt: toDate(data.deletedAt) } as MediaAsset;
}

type MediaWrite = Partial<Omit<MediaAsset, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>> & {
  createdAt?: Date | FieldValue; updatedAt?: Date | FieldValue; deletedAt?: Date | FieldValue | null;
};

export function toMediaWriteData(data: MediaWrite & { id?: string }): Record<string, unknown> {
  const { id: _id, ...record } = data;
  return removeUndefined(record);
}
