import type { MediaCategory, MediaUploadState } from './media.types';

export const ALLOWED_MEDIA_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf'] as const;
export const ALLOWED_MEDIA_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'pdf'] as const;
export const MAX_MEDIA_FILE_SIZE_BYTES = 100 * 1024 * 1024;
export const MAX_MEDIA_BATCH_SIZE_BYTES = 500 * 1024 * 1024;
export const MAX_MEDIA_BATCH_FILES = 20;
export const MAX_MEDIA_PER_POST = 10;
export const MAX_CONCURRENT_UPLOADS = 3;
export const MAX_AUTOMATIC_RETRIES = 0;
export const MEDIA_LIBRARY_PAGE_SIZE = 24;
export const MEDIA_CATEGORIES: readonly MediaCategory[] = ['feed', 'stories', 'reels', 'carousel', 'invoice', 'other'];
export const MEDIA_UPLOAD_STATES: readonly MediaUploadState[] = ['queued', 'uploading', 'completed', 'failed', 'cancelled'];
