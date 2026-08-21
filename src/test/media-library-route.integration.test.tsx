import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaAsset, MediaLibraryFilters } from '../media';

let role: 'admin' | 'client' = 'admin';
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: {}, role, loading: false, authError: null, isAdmin: role === 'admin', brandId: role === 'client' ? 'client' : null }) }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(() => 'toast'), { success: vi.fn(() => 'success'), error: vi.fn(), dismiss: vi.fn() }), Toaster: () => <div /> }));
vi.mock('../hooks', async importOriginal => {
  const actual = await importOriginal<typeof import('../hooks')>();
  return {
    ...actual,
    useBrands: () => ({ brands: [{ id: 'b', name: 'Marca B' }], loading: false, error: null }),
    useMediaLibrary: () => {
      const initial: MediaAsset = { id: 'm', brandId: 'b', fileName: 'stored.jpg', originalFileName: 'Foto.jpg', mediaType: 'image', category: 'feed', mimeType: 'image/jpeg', sizeBytes: 100, storagePath: 'safe', downloadUrl: 'https://example.test/image', status: 'ready', source: 'upload', createdAt: new Date() };
      const [items, setItems] = useState([initial]); const [filters, setFilters] = useState<MediaLibraryFilters>({ status: 'ready', order: 'newest' });
      return { media: items.filter(item => !filters.brandId || item.brandId === filters.brandId).filter(item => !filters.status || item.status === filters.status), loading: false, error: null, filters, setFilters, page: 1, hasNextPage: false, hasPreviousPage: false, nextPage: vi.fn(), previousPage: vi.fn(), refresh: vi.fn(), selectedMedia: null, selectMedia: vi.fn(), clearSelection: vi.fn(), deleteMedia: async (asset: MediaAsset) => setItems(current => current.map(item => item.id === asset.id ? { ...item, status: 'deleted' as const } : item)), restoreMedia: async (asset: MediaAsset) => setItems(current => current.map(item => item.id === asset.id ? { ...item, status: 'ready' as const } : item)), permanentlyDeleteMedia: vi.fn() };
    },
  };
});
import RoleGuard from '../app/router/RoleGuard';
import ModalProvider from '../app/providers/ModalProvider';
import FeedbackProvider from '../app/providers/FeedbackProvider';
import AdminMediaLibraryPage from '../pages/admin/AdminMediaLibraryPage';

const App = () => <ModalProvider><FeedbackProvider><MemoryRouter initialEntries={['/admin/midias']}><Routes><Route element={<RoleGuard role="admin" />}><Route path="/admin/midias" element={<AdminMediaLibraryPage />} /></Route><Route path="/cliente" element={<span>Área cliente</span>} /></Routes></MemoryRouter></FeedbackProvider></ModalProvider>;

describe('integração da biblioteca administrativa', () => {
  beforeEach(() => { role = 'admin'; });
  it('admin filtra, abre, fecha, exclui e restaura', async () => { render(<App />); expect(screen.getByText('Biblioteca de mídias')).toBeInTheDocument(); fireEvent.change(screen.getByLabelText('Filtrar por cliente'), { target: { value: 'b' } }); fireEvent.click(screen.getByRole('button', { name: /visualizar foto/i })); expect(screen.getByRole('dialog')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Fechar' })); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument()); fireEvent.click(screen.getByRole('button', { name: /mover foto.*lixeira/i })); fireEvent.click(await screen.findByRole('button', { name: 'Mover para lixeira' })); await waitFor(() => expect(screen.getByText('Nenhuma mídia encontrada com esses filtros.')).toBeInTheDocument()); fireEvent.change(screen.getByLabelText('Filtrar por status'), { target: { value: 'deleted' } }); expect(await screen.findByText('Foto.jpg')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: /restaurar foto/i })); await waitFor(() => expect(screen.getByText('Nenhuma mídia na lixeira.')).toBeInTheDocument()); });
  it('redireciona cliente', () => { role = 'client'; render(<App />); expect(screen.getByText('Área cliente')).toBeInTheDocument(); expect(screen.queryByText('Biblioteca de mídias')).not.toBeInTheDocument(); });
});
