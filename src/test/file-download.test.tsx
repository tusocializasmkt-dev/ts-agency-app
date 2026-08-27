import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFileDownload } from '../hooks/useFileDownload';

describe('useFileDownload', () => {
  it('baixa blob com o nome original sanitizado', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(['arquivo'])) }));
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() });
    const { result } = renderHook(() => useFileDownload());
    await act(() => result.current.download('media-1', 'https://storage.test/file.png', 'arte:final.png'));
    expect(click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    click.mockRestore();
    vi.unstubAllGlobals();
  });

  it('rejeita URL insegura', async () => {
    const { result } = renderHook(() => useFileDownload());
    await expect(result.current.download('media-1', 'javascript:alert(1)', 'arquivo')).rejects.toThrow('invalid-download-url');
  });
});
