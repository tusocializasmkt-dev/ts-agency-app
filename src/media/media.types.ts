export type MediaType = 'image' | 'video' | 'document';
export type MediaCategory = 'feed' | 'stories' | 'reels' | 'carousel' | 'invoice' | 'other';
export type MediaStatus = 'pending' | 'ready' | 'failed' | 'deleted';
export type MediaSource = 'upload';
export type MediaUploadState = 'queued' | 'uploading' | 'completed' | 'failed' | 'cancelled';
export type MediaSortOrder = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc';

export interface MediaAsset {
  id: string;
  brandId: string;
  fileName: string;
  originalFileName: string;
  mediaType: MediaType;
  category: MediaCategory;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  downloadUrl?: string;
  status: MediaStatus;
  source: MediaSource;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface MediaUploadProgress { bytesTransferred: number; totalBytes: number; percentage: number; }

export interface MediaUploadItem {
  id: string;
  brandId: string;
  file: File;
  category: MediaCategory;
  state: MediaUploadState;
  progress: MediaUploadProgress;
  mediaId?: string;
  error?: string;
  attempts: number;
}

export interface MediaValidationResult { valid: boolean; errors: import('./media.errors').MediaError[]; }

export interface MediaLibraryFilters {
  brandId?: string;
  type?: MediaType;
  category?: MediaCategory;
  status?: MediaStatus;
  search?: string;
  order?: MediaSortOrder;
}

export interface MediaPageRequest extends MediaLibraryFilters { pageSize?: number; cursor?: string; brandIds?: string[]; }
export interface MediaPage { items: MediaAsset[]; nextCursor?: string; hasMore: boolean; }

export interface PreparedMediaUpload {
  mediaId: string;
  storagePath: string;
  record: Omit<MediaAsset, 'id' | 'createdAt' | 'updatedAt'>;
}
