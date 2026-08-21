import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import type { TrashItem } from '../../types';
import { mapPost, toPostWriteData } from './post.mapper';

export const mapTrashItem = (snapshot: QueryDocumentSnapshot<DocumentData>): TrashItem =>
  mapPost(snapshot) as TrashItem;

export function toRestoredPostWriteData(item: TrashItem): Record<string, unknown> {
  const { sourceCollection, deletedAt, ...post } = item;
  return toPostWriteData(post);
}
