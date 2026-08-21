import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaUploadItem } from '../media';

const mocks = vi.hoisted(() => ({ useBrands: vi.fn(), useMediaUpload: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), confirm: vi.fn() }));
vi.mock('../hooks', () => ({ useBrands: mocks.useBrands, useMediaUpload: mocks.useMediaUpload, useFeedback: () => ({ success: mocks.success, error: mocks.error, warning: mocks.warning, info: mocks.info }), useModal: () => ({ confirm: mocks.confirm }) }));
import MediaUploadPanel from '../components/media/MediaUploadPanel';

const file = new File(['image'], 'foto.jpg', { type: 'image/jpeg' });
const item = (state: MediaUploadItem['state']): MediaUploadItem => ({ id: 'm', mediaId: 'm', brandId: 'b', file, category: 'other', state, progress: { bytesTransferred: state === 'completed' ? 100 : 25, totalBytes: 100, percentage: state === 'completed' ? 100 : 25 }, attempts: 1 });
const uploadState = (items: MediaUploadItem[] = []) => ({ items, isUploading: items.some(value => value.state === 'uploading'), enqueue: vi.fn(), start: vi.fn(), cancel: vi.fn(() => true), retry: vi.fn(() => true), clearCompleted: vi.fn(), clearAll: vi.fn(), totalProgress: items.length ? items[0].progress.percentage : 0, error: null });

describe('MediaUploadPanel', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.useBrands.mockReturnValue({ brands: [{ id: 'b', name: 'Cliente B' }], loading: false, error: null }); mocks.confirm.mockResolvedValue(true); mocks.useMediaUpload.mockReturnValue(uploadState()); });
  it('seleciona marca, enfileira e envia feedback', () => { const upload = uploadState(); mocks.useMediaUpload.mockReturnValue(upload); render(<MediaUploadPanel />); fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'b' } }); fireEvent.change(screen.getByLabelText('Escolher arquivos de mídia'), { target: { files: [file] } }); expect(upload.enqueue).toHaveBeenCalledWith('b', [file]); expect(mocks.success).toHaveBeenCalledWith('Lote aceito', expect.anything()); });
  it('inicia fila e mostra progresso geral', async () => { const upload = uploadState([item('queued')]); mocks.useMediaUpload.mockReturnValue(upload); render(<MediaUploadPanel />); fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'b' } }); await waitFor(() => expect(screen.getByRole('button', { name: /iniciar upload/i })).toBeEnabled()); fireEvent.click(screen.getByRole('button', { name: /iniciar upload/i })); expect(upload.start).toHaveBeenCalled(); expect(screen.getByRole('progressbar', { name: /progresso geral/i })).toHaveAttribute('aria-valuenow', '25'); });
  it('limpa concluídos', () => { const upload = uploadState([item('completed')]); mocks.useMediaUpload.mockReturnValue(upload); render(<MediaUploadPanel />); fireEvent.click(screen.getByRole('button', { name: /remover concluídos/i })); expect(upload.clearCompleted).toHaveBeenCalled(); });
  it('confirma troca de marca com fila', async () => { const upload = uploadState([item('uploading')]); mocks.useMediaUpload.mockReturnValue(upload); render(<MediaUploadPanel />); fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'b' } }); await vi.waitFor(() => expect(mocks.confirm).toHaveBeenCalled()); expect(upload.clearAll).toHaveBeenCalled(); });
});
