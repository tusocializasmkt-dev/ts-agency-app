import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaAsset } from '../media';

const mocks = vi.hoisted(() => ({ useBrands: vi.fn(), useMediaLibrary: vi.fn(), openModal: vi.fn(), closeModal: vi.fn(), closeAll: vi.fn(), confirm: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('../hooks', () => ({ useBrands: mocks.useBrands, useMediaLibrary: mocks.useMediaLibrary, useFeedback: () => ({ success: mocks.success, error: mocks.error, warning: vi.fn(), info: vi.fn() }), useModal: () => ({ openModal: mocks.openModal, closeModal: mocks.closeModal, closeAll: mocks.closeAll, confirm: mocks.confirm }) }));
import MediaLibrary from '../components/media/MediaLibrary';

const asset = (status: MediaAsset['status'] = 'ready'): MediaAsset => ({ id: 'm', brandId: 'b', fileName: 'stored.jpg', originalFileName: 'Foto.jpg', mediaType: 'image', category: 'feed', mimeType: 'image/jpeg', sizeBytes: 100, storagePath: 'safe', downloadUrl: 'https://example.test/image', status, source: 'upload', createdAt: new Date() });
const state = (overrides = {}) => ({ media: [], loading: false, error: null, filters: { status: 'ready', order: 'newest' }, setFilters: vi.fn(), page: 1, hasNextPage: false, hasPreviousPage: false, nextPage: vi.fn(), previousPage: vi.fn(), refresh: vi.fn(), selectedMedia: null, selectMedia: vi.fn(), clearSelection: vi.fn(), deleteMedia: vi.fn().mockResolvedValue(undefined), restoreMedia: vi.fn().mockResolvedValue(undefined), permanentlyDeleteMedia: vi.fn(), ...overrides });
const show = () => render(<MemoryRouter><MediaLibrary /></MemoryRouter>);

describe('MediaLibrary', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.useBrands.mockReturnValue({ brands: [{ id: 'b', name: 'Marca B' }], loading: false, error: null }); mocks.useMediaLibrary.mockReturnValue(state()); mocks.confirm.mockResolvedValue(true); });
  it('mostra loading por skeleton', () => { mocks.useMediaLibrary.mockReturnValue(state({ loading: true })); show(); expect(screen.getByLabelText('Carregando mídias')).toBeInTheDocument(); });
  it('mostra empty state', () => { show(); expect(screen.getByText('Nenhuma mídia enviada ainda.')).toBeInTheDocument(); expect(screen.getByRole('link', { name: /enviar arquivos/i })).toHaveAttribute('href', '/admin/midias/upload'); });
  it('mostra erro e permite tentar novamente', () => { const library = state({ error: 'Erro amigável' }); mocks.useMediaLibrary.mockReturnValue(library); show(); fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i })); expect(library.refresh).toHaveBeenCalled(); });
  it('mostra grid, filtra, pagina e seleciona', () => { const library = state({ media: [asset()], hasNextPage: true }); mocks.useMediaLibrary.mockReturnValue(library); show(); expect(screen.getByText('Foto.jpg')).toBeInTheDocument(); fireEvent.change(screen.getByLabelText('Filtrar por cliente'), { target: { value: 'b' } }); expect(library.setFilters).toHaveBeenCalledWith(expect.objectContaining({ brandId: 'b' })); fireEvent.click(screen.getByRole('button', { name: /próxima/i })); expect(library.nextPage).toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: /visualizar foto/i })); expect(library.selectMedia).toHaveBeenCalledWith(expect.objectContaining({ id: 'm' })); expect(mocks.openModal).toHaveBeenCalled(); });
  it('faz soft delete confirmado e feedback', async () => { const library = state({ media: [asset()] }); mocks.useMediaLibrary.mockReturnValue(library); show(); fireEvent.click(screen.getByRole('button', { name: /mover foto.*lixeira/i })); await waitFor(() => expect(library.deleteMedia).toHaveBeenCalled()); expect(mocks.success).toHaveBeenCalledWith('Mídia movida para a lixeira'); });
  it('restaura mídia excluída', async () => { const library = state({ media: [asset('deleted')], filters: { status: 'deleted', order: 'newest' } }); mocks.useMediaLibrary.mockReturnValue(library); show(); fireEvent.click(screen.getByRole('button', { name: /restaurar foto/i })); await waitFor(() => expect(library.restoreMedia).toHaveBeenCalled()); expect(mocks.success).toHaveBeenCalledWith('Mídia restaurada'); });
});
