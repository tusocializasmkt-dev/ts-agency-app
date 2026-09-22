import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFileDownload } from '../hooks/useFileDownload';
import { downloadFile, downloadName } from '../services/file-download';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('useFileDownload', () => {
  it('baixa blob com o nome original sanitizado', async () => {
    vi.useFakeTimers();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(['arquivo'])) }));
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() });
    const { result } = renderHook(() => useFileDownload());
    await act(() => result.current.download('media-1', 'https://storage.test/file.png', 'arte:final.png'));
    expect(click).toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    click.mockRestore();
    vi.unstubAllGlobals();
  });

  it('erro HTTP ou CORS não abre aba e restaura estado', async () => {
    const open = vi.spyOn(window, 'open');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('CORS')));
    const { result } = renderHook(() => useFileDownload());
    await act(async () => { await expect(result.current.download('a', 'https://example.test/a', 'a')).rejects.toThrow('CORS'); });
    expect(result.current.downloadingId).toBeNull(); expect(open).not.toHaveBeenCalled();
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    await expect(downloadFile('https://example.test/a', 'a')).rejects.toThrow('download-failed');
  });

  it('grava vídeo em stream quando o navegador permite, sem criar blob', async () => {
    const pipeTo = vi.fn().mockResolvedValue(undefined); const destination = {};
    vi.stubGlobal('showSaveFilePicker', vi.fn().mockResolvedValue({ createWritable: async () => destination }));
    const blob = vi.fn(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: { pipeTo }, blob }));
    await downloadFile('https://example.test/a.mp4', 'original.mp4');
    expect(pipeTo).toHaveBeenCalledWith(destination); expect(blob).not.toHaveBeenCalled();
  });

  it('limita consumo de memória de arquivos grandes no fallback', async () => {
    const cancel = vi.fn(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ 'content-length': '200000000' }), body: { cancel } }));
    await expect(downloadFile('https://example.test/a.mp4', 'a.mp4')).rejects.toThrow('download-too-large');
    expect(cancel).toHaveBeenCalled();
  });

  it('preserva nomes originais e produz fallback com extensão', () => {
    expect(downloadName('arte:final.png', 'https://example.test/file')).toBe('arte-final.png');
    expect(downloadName('', 'https://example.test/', 'video/mp4')).toBe('arquivo.mp4');
  });

  it('cancela stream sem Content-Length ao ultrapassar limite', async () => {
    const cancel = vi.fn(); const releaseLock = vi.fn();
    const read = vi.fn().mockResolvedValue({ done: false, value: { byteLength: 101 * 1024 * 1024 } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, headers: new Headers(), body: { getReader: () => ({ read, cancel, releaseLock }) } }));
    await expect(downloadFile('https://example.test/a.mp4', 'a.mp4')).rejects.toThrow('download-too-large');
    expect(cancel).toHaveBeenCalled(); expect(releaseLock).toHaveBeenCalled();
  });

  it('rejeita URL insegura', async () => {
    const { result } = renderHook(() => useFileDownload());
    await expect(result.current.download('media-1', 'javascript:alert(1)', 'arquivo')).rejects.toThrow('invalid-download-url');
  });
});
