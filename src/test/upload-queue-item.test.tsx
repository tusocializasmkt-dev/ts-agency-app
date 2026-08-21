import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UploadQueueItem from '../components/media/UploadQueueItem';
import type { MediaUploadItem, MediaUploadState } from '../media';

const makeItem = (state: MediaUploadState, percentage = 0): MediaUploadItem => ({ id: 'm1', mediaId: 'm1', brandId: 'b', file: new File(['image'], 'foto.jpg', { type: 'image/jpeg' }), category: 'feed', state, progress: { bytesTransferred: percentage, totalBytes: 100, percentage }, attempts: 1, error: state === 'failed' ? 'Falha amigável' : undefined });

describe('UploadQueueItem', () => {
  beforeEach(() => { vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() }); });
  afterEach(() => vi.unstubAllGlobals());
  it.each([['queued', 'Na fila'], ['uploading', 'Enviando'], ['completed', 'Concluído'], ['failed', 'Falhou'], ['cancelled', 'Cancelado']] as const)('mostra status %s', (state, label) => { render(<UploadQueueItem item={makeItem(state)} onCancel={vi.fn()} onRetry={vi.fn()} />); expect(screen.getByRole('status')).toHaveTextContent(label); });
  it('mostra progresso e cancela ativo', () => { const cancel = vi.fn(); render(<UploadQueueItem item={makeItem('uploading', 42)} onCancel={cancel} onRetry={vi.fn()} />); expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42'); fireEvent.click(screen.getByRole('button', { name: /cancelar/i })); expect(cancel).toHaveBeenCalledWith('m1'); });
  it.each(['failed', 'cancelled'] as const)('permite retry de %s', state => { const retry = vi.fn(); render(<UploadQueueItem item={makeItem(state)} onCancel={vi.fn()} onRetry={retry} />); fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i })); expect(retry).toHaveBeenCalledWith('m1'); });
  it('revoga preview local no cleanup', () => { const view = render(<UploadQueueItem item={makeItem('queued')} onCancel={vi.fn()} onRetry={vi.fn()} />); view.unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview'); });
});
