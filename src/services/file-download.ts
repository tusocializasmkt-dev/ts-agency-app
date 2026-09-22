import { MAX_MEDIA_FILE_SIZE_BYTES } from '../media/media.constants';

type SavePicker = (options: { suggestedName: string }) => Promise<{ createWritable(): Promise<WritableStream<Uint8Array>> }>;
const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'application/pdf': 'pdf' };
export function downloadName(name: string, url: string, mime = '') {
  let fallback = '';
  try { fallback = decodeURIComponent(new URL(url).pathname.split('/').pop() || '').split('/').pop() || ''; } catch { /* Use a neutral name. */ }
  const safe = (name || fallback || 'arquivo').replace(/[\u0000-\u001f\\/:*?"<>|]/g, '-').replace(/[. ]+$/g, '').trim().slice(0, 180) || 'arquivo';
  return /\.[a-z0-9]{2,5}$/i.test(safe) || !extensions[mime] ? safe : `${safe}.${extensions[mime]}`;
}

export async function downloadFile(url: string, name: string) {
  if (!/^https?:\/\//i.test(url)) throw new Error('invalid-download-url');
  const picker = (window as Window & { showSaveFilePicker?: SavePicker }).showSaveFilePicker;
  // Request the destination during the click gesture; stream large files directly to disk.
  const handle = picker ? await picker.call(window, { suggestedName: downloadName(name, url) }) : undefined;
  const response = await fetch(url);
  if (!response.ok) throw new Error('download-failed');
  if (handle && response.body) {
    await response.body.pipeTo(await handle.createWritable());
    return;
  }
  // Safari/Firefox fallback is bounded by the application's existing upload limit.
  const limit = MAX_MEDIA_FILE_SIZE_BYTES;
  if (Number(response.headers?.get('content-length')) > limit) {
    await response.body?.cancel();
    throw new Error('download-too-large');
  }
  const mime = response.headers?.get('content-type')?.split(';')[0] || '';
  let blob: Blob;
  if (response.body) {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) { await reader.cancel(); throw new Error('download-too-large'); }
        chunks.push(value);
      }
      blob = new Blob(chunks, { type: mime });
    } finally { reader.releaseLock(); }
  } else {
    blob = await response.blob();
    if (blob.size > limit) throw new Error('download-too-large');
  }
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  try {
    anchor.href = objectUrl;
    anchor.download = downloadName(name, url, mime || blob.type);
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    // Give the browser time to consume the URL before releasing it.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }
}
