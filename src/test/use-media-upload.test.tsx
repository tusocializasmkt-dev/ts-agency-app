import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMediaUpload } from '../hooks/useMediaUpload';

const file = (name: string) => new File(['x'], name, { type: 'image/jpeg' });
describe('useMediaUpload', () => {
  it('enfileira FIFO, limita concorrência, progride, cancela, retry e limpa', async () => {
    const completions: Array<{ resolve: (value: never) => void; reject: (error: Error) => void }> = []; let active = 0; let peak = 0;
    const starter = vi.fn((_brand, _file, _category, mediaId, progress) => { active += 1; peak = Math.max(peak, active); progress({ bytesTransferred: 1, totalBytes: 1, percentage: 100 }); let resolve!: (value: never) => void; let reject!: (error: Error) => void; const completion = new Promise<never>((ok, fail) => { resolve = ok; reject = fail; }).finally(() => { active -= 1; }); completions.push({ resolve, reject }); return { mediaId, cancel: () => { reject(new Error('cancel')); return true; }, completion }; });
    const { result } = renderHook(() => useMediaUpload(starter));
    act(() => { result.current.enqueue('b', [file('1.jpg'), file('2.jpg'), file('3.jpg'), file('4.jpg')]); result.current.start(); });
    await waitFor(() => expect(starter).toHaveBeenCalledTimes(3)); expect(peak).toBe(3); expect(result.current.totalProgress).toBeGreaterThan(0);
    act(() => completions[0].resolve(undefined as never)); await waitFor(() => expect(starter).toHaveBeenCalledTimes(4));
    const queuedOrUploading = result.current.items.find(item => item.state === 'uploading')!; act(() => result.current.cancel(queuedOrUploading.id)); await waitFor(() => expect(result.current.items.find(item => item.id === queuedOrUploading.id)?.state).toBe('failed'));
    act(() => result.current.retry(queuedOrUploading.id)); await waitFor(() => expect(starter).toHaveBeenCalledTimes(5));
    completions.forEach(entry => entry.resolve(undefined as never)); await waitFor(() => expect(result.current.items.some(item => item.state === 'uploading')).toBe(false)); act(() => result.current.clearCompleted()); expect(result.current.items.every(item => item.state !== 'completed')).toBe(true);
  });
});
