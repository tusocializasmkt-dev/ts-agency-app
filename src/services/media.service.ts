import type { MediaAsset, MediaCategory, MediaLibraryFilters, MediaUploadProgress, PreparedMediaUpload } from '../media';
import { MediaError, buildBrandMediaPath, normalizeMediaError, validateMediaBatch, validateMediaFile } from '../media';
import * as mediaRepository from '../data/repositories/media.repository';
import * as storageRepository from '../data/repositories/storage.repository';

export { validateMediaFile, validateMediaBatch };
export const watchBrandMedia = mediaRepository.subscribeToMediaByBrand;
export const loadMedia = mediaRepository.getMediaById;
export const listMediaPage = mediaRepository.listMediaPage;
export const getMediaDetails = mediaRepository.getMediaById;
const mediaCache = new Map<string, MediaAsset>();

export async function loadMediaByIds(ids: readonly string[]): Promise<MediaAsset[]> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  const missingIds = uniqueIds.filter(id => !mediaCache.has(id));
  if (missingIds.length) (await mediaRepository.getMediaByIds(missingIds)).forEach(asset => mediaCache.set(asset.id, asset));
  return uniqueIds.map(id => mediaCache.get(id)).filter((asset): asset is MediaAsset => Boolean(asset));
}

function requireBrand(brandId: string): string {
  if (!brandId.trim()) throw new MediaError('invalid-brand');
  return brandId;
}

export function prepareMediaUpload(brandId: string, file: File, category: MediaCategory, mediaId: string = crypto.randomUUID()): PreparedMediaUpload {
  requireBrand(brandId);
  const validation = validateMediaFile(file);
  if (!validation.valid) throw validation.errors[0];
  const storagePath = buildBrandMediaPath(brandId, mediaId, file.name);
  return {
    mediaId, storagePath,
    record: { brandId, fileName: storagePath.split('/').pop()!, originalFileName: file.name, mediaType: file.type === 'application/pdf' ? 'document' : file.type.startsWith('video/') ? 'video' : 'image', category, mimeType: file.type, sizeBytes: file.size, storagePath, status: 'pending', source: 'upload' },
  };
}

export const createPendingMediaRecord = (prepared: PreparedMediaUpload) => mediaRepository.createMediaRecord(prepared.record, prepared.mediaId);
export const completeMediaUpload = (brandId: string, mediaId: string, downloadUrl: string) => mediaRepository.updateMediaMetadata(brandId, mediaId, { status: 'ready', downloadUrl });
export const failMediaUpload = (brandId: string, mediaId: string) => mediaRepository.updateMediaMetadata(brandId, mediaId, { status: 'failed' });
export const softDeleteMedia = mediaRepository.markMediaDeleted;
export const restoreMedia = mediaRepository.restoreMedia;

export async function permanentlyDeleteMedia(brandId: string, mediaId: string): Promise<void> {
  const asset = await mediaRepository.getMediaById(requireBrand(brandId), mediaId);
  if (!asset) return;
  await storageRepository.deleteStoredFile(storageRepository.createStorageReference(asset.storagePath));
  await mediaRepository.permanentlyDeleteMediaRecord(brandId, mediaId);
}

export interface MediaUploadOperation { mediaId: string; cancel: () => boolean; completion: Promise<MediaAsset>; }

export function startPreparedMediaUpload(prepared: PreparedMediaUpload, file: File, onProgress?: (progress: MediaUploadProgress) => void): MediaUploadOperation {
  let controller: storageRepository.UploadController | undefined;
  const completion = (async () => {
    await createPendingMediaRecord(prepared);
    const reference = storageRepository.createStorageReference(prepared.storagePath);
    controller = storageRepository.uploadFile(reference, file, { onProgress: (bytesTransferred, totalBytes) => onProgress?.({ bytesTransferred, totalBytes, percentage: totalBytes ? Math.round(bytesTransferred / totalBytes * 100) : 0 }) });
    try {
      const uploadedReference = await controller.completion;
      const downloadUrl = await storageRepository.getFileDownloadUrl(uploadedReference);
      try { await completeMediaUpload(prepared.record.brandId, prepared.mediaId, downloadUrl); }
      catch (error) {
        try { await storageRepository.deleteStoredFile(uploadedReference); }
        catch { throw new MediaError('orphaned-file', error); }
        throw new MediaError('metadata-write-failed', error);
      }
      return { id: prepared.mediaId, ...prepared.record, status: 'ready' as const, downloadUrl };
    } catch (error) {
      const normalized = normalizeMediaError(error);
      try { await failMediaUpload(prepared.record.brandId, prepared.mediaId); } catch { /* original error remains actionable */ }
      throw normalized;
    }
  })();
  return { mediaId: prepared.mediaId, cancel: () => controller?.cancel() ?? false, completion };
}

export const filterMedia = (items: MediaAsset[], filters: MediaLibraryFilters): MediaAsset[] => {
  const search = filters.search?.trim().toLowerCase();
  const filtered = items.filter(item => (!filters.type || item.mediaType === filters.type) && (!filters.category || item.category === filters.category) && (!filters.status || item.status === filters.status) && (!search || item.originalFileName.toLowerCase().includes(search) || item.fileName.toLowerCase().includes(search)));
  return [...filtered].sort((left, right) => {
    if (filters.order === 'name-asc') return left.originalFileName.localeCompare(right.originalFileName);
    if (filters.order === 'name-desc') return right.originalFileName.localeCompare(left.originalFileName);
    if (filters.order === 'size-desc') return right.sizeBytes - left.sizeBytes;
    if (filters.order === 'size-asc') return left.sizeBytes - right.sizeBytes;
    return 0;
  });
};
