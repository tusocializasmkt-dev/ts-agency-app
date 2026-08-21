import type { DocumentData, DocumentSnapshot } from 'firebase/firestore';
import type { Post } from '../../types';
import { removeUndefined } from '../firebase';

export function mapPost(snapshot: DocumentSnapshot<DocumentData>): Post {
  const data = snapshot.data();
  const mediaIds = Array.isArray(data.mediaIds) ? [...new Set(data.mediaIds.filter((id: unknown): id is string => typeof id === 'string' && Boolean(id)))] : undefined;
  const mediaUrls = Array.isArray(data.mediaUrls) ? [...new Set(data.mediaUrls.filter((url: unknown): url is string => typeof url === 'string' && Boolean(url)))] : undefined;
  const status = data.status === 'pending' && typeof data.feedback === 'string' && data.feedback.trim() ? 'changes_requested' : data.status;
  return {
    ...data,
    id: snapshot.id,
    type: data.type === 'post' ? 'feed' : data.type,
    scheduledDate: data.scheduledDate ?? data.scheduledAt,
    feedback: data.feedback ?? data.rejectionComment,
    status,
    mediaIds,
    coverMediaId: mediaIds?.includes(data.coverMediaId) ? data.coverMediaId : undefined,
    mediaUrls,
  } as Post;
}

export function toPostWriteData(data: Partial<Post>): Record<string, unknown> {
  const { id, ...record } = data;
  const mediaIds = record.mediaIds ? [...new Set(record.mediaIds.filter(Boolean))] : undefined;
  const coverMediaId = record.coverMediaId && mediaIds?.includes(record.coverMediaId) ? record.coverMediaId : undefined;
  return removeUndefined({ ...record, mediaIds, coverMediaId });
}
