import { deleteObject, getDownloadURL, getMetadata, ref, uploadBytesResumable, type FullMetadata, type StorageReference, type UploadTask } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { normalizeMediaError } from '../../media';

export const createStorageReference = (path: string): StorageReference => ref(storage, path);

export interface UploadCallbacks {
  onProgress?: (bytesTransferred: number, totalBytes: number) => void;
}

export interface UploadController { task: UploadTask; completion: Promise<StorageReference>; cancel: () => boolean; }

export function uploadFile(reference: StorageReference, file: Blob | Uint8Array | ArrayBuffer, callbacks: UploadCallbacks = {}): UploadController {
  const task = uploadBytesResumable(reference, file);
  const completion = new Promise<StorageReference>((resolve, reject) => {
    task.on('state_changed', snapshot => callbacks.onProgress?.(snapshot.bytesTransferred, snapshot.totalBytes), error => reject(normalizeMediaError(error)), () => resolve(task.snapshot.ref));
  });
  return { task, completion, cancel: () => task.cancel() };
}

export const cancelUpload = (upload: Pick<UploadController, 'cancel'>): boolean => upload.cancel();
export async function getFileDownloadUrl(reference: StorageReference): Promise<string> { try { return await getDownloadURL(reference); } catch (error) { throw normalizeMediaError(error); } }
export async function deleteStoredFile(reference: StorageReference): Promise<void> { try { await deleteObject(reference); } catch (error) { throw normalizeMediaError(error); } }
export async function getStorageMetadata(reference: StorageReference): Promise<FullMetadata> { try { return await getMetadata(reference); } catch (error) { throw normalizeMediaError(error); } }
