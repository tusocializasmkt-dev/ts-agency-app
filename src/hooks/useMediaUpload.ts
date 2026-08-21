import { useCallback, useMemo, useRef, useState } from 'react';
import { MAX_CONCURRENT_UPLOADS, MediaError, type MediaCategory, type MediaUploadItem, type MediaUploadProgress, validateMediaBatch } from '../media';
import { prepareMediaUpload, startPreparedMediaUpload, type MediaUploadOperation } from '../services/media.service';

type UploadStarter = (brandId: string, file: File, category: MediaCategory, mediaId: string, onProgress: (progress: MediaUploadProgress) => void) => MediaUploadOperation;

const defaultStarter: UploadStarter = (brandId, file, category, mediaId, onProgress) => startPreparedMediaUpload(prepareMediaUpload(brandId, file, category, mediaId), file, onProgress);

export function useMediaUpload(starter: UploadStarter = defaultStarter) {
  const [items, setItems] = useState<MediaUploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const itemsRef = useRef<MediaUploadItem[]>([]);
  const operations = useRef(new Map<string, MediaUploadOperation>());
  const running = useRef(0);
  const started = useRef(false);

  const replaceItems = useCallback((updater: (current: MediaUploadItem[]) => MediaUploadItem[]) => { const next = updater(itemsRef.current); itemsRef.current = next; setItems(next); }, []);
  const update = useCallback((id: string, fields: Partial<MediaUploadItem>) => replaceItems(current => current.map(item => item.id === id ? { ...item, ...fields } : item)), [replaceItems]);

  const pump = useCallback(() => {
    if (!started.current) return;
    while (running.current < MAX_CONCURRENT_UPLOADS) {
      const item = itemsRef.current.find(candidate => candidate.state === 'queued');
      if (!item) break;
      running.current += 1;
      update(item.id, { state: 'uploading', attempts: item.attempts + 1, error: undefined });
      let operation: MediaUploadOperation;
      try { operation = starter(item.brandId, item.file, item.category, item.mediaId ?? item.id, progress => update(item.id, { progress })); }
      catch (cause) { running.current -= 1; const message = cause instanceof Error ? cause.message : 'Falha no envio.'; update(item.id, { state: 'failed', error: message }); setError(message); queueMicrotask(pump); continue; }
      operations.current.set(item.id, operation);
      operation.completion.then(() => update(item.id, { state: 'completed', progress: { bytesTransferred: item.file.size, totalBytes: item.file.size, percentage: 100 } }), cause => {
        const cancelled = cause instanceof MediaError && cause.code === 'cancelled';
        const message = cause instanceof Error ? cause.message : 'Falha no envio.';
        update(item.id, { state: cancelled ? 'cancelled' : 'failed', error: cancelled ? undefined : message });
        if (!cancelled) setError(message);
      }).finally(() => { operations.current.delete(item.id); running.current -= 1; queueMicrotask(pump); });
    }
  }, [starter, update]);

  const enqueue = useCallback((brandId: string, files: readonly File[], category: MediaCategory = 'other') => {
    const validation = validateMediaBatch(files);
    if (!validation.valid) { setError(validation.errors[0].message); throw validation.errors[0]; }
    const queued = files.map(file => { const id = crypto.randomUUID(); return { id, mediaId: id, brandId, file, category, state: 'queued' as const, progress: { bytesTransferred: 0, totalBytes: file.size, percentage: 0 }, attempts: 0 }; });
    replaceItems(current => [...current, ...queued]); setError(null); queueMicrotask(pump); return queued.map(item => item.id);
  }, [pump, replaceItems]);

  const start = useCallback(() => { started.current = true; pump(); }, [pump]);
  const cancel = useCallback((id: string) => {
    const item = itemsRef.current.find(candidate => candidate.id === id);
    if (!item || !['queued', 'uploading'].includes(item.state)) return false;
    if (item.state === 'queued') { update(id, { state: 'cancelled' }); return true; }
    return operations.current.get(id)?.cancel() ?? false;
  }, [update]);
  const retry = useCallback((id: string) => { const item = itemsRef.current.find(candidate => candidate.id === id); if (!item || !['failed', 'cancelled'].includes(item.state)) return false; update(id, { state: 'queued', error: undefined, progress: { bytesTransferred: 0, totalBytes: item.file.size, percentage: 0 } }); queueMicrotask(pump); return true; }, [pump, update]);
  const clearCompleted = useCallback(() => replaceItems(current => current.filter(item => item.state !== 'completed')), [replaceItems]);
  const clearAll = useCallback(() => {
    operations.current.forEach(operation => operation.cancel());
    operations.current.clear();
    replaceItems(() => []);
  }, [replaceItems]);

  const totalProgress = useMemo(() => { const total = items.reduce((sum, item) => sum + item.progress.totalBytes, 0); return total ? Math.round(items.reduce((sum, item) => sum + item.progress.bytesTransferred, 0) / total * 100) : 0; }, [items]);
  return { items, isUploading: items.some(item => item.state === 'uploading'), enqueue, start, cancel, retry, clearCompleted, clearAll, totalProgress, error };
}
