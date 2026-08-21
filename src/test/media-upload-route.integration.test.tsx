import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaUploadItem } from '../media';

let role: 'admin' | 'client' = 'admin';
const feedback = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: {}, role, loading: false, authError: null, isAdmin: role === 'admin', brandId: role === 'client' ? 'client' : null }) }));
vi.mock('../hooks', () => ({
  useBrands: () => ({ brands: [{ id: 'brand', name: 'Cliente Teste' }], loading: false, error: null }),
  useFeedback: () => feedback,
  useModal: () => ({ confirm: vi.fn(async () => true) }),
  useMediaUpload: () => {
    const [items, setItems] = useState<MediaUploadItem[]>([]);
    return {
      items, isUploading: items.some(item => item.state === 'uploading'), error: null,
      enqueue: (brandId: string, files: File[]) => setItems(files.map((file, index) => ({ id: `m${index}`, mediaId: `m${index}`, brandId, file, category: 'other', state: 'queued', progress: { bytesTransferred: 0, totalBytes: file.size, percentage: 0 }, attempts: 0 }))),
      start: () => setItems(current => current.map(item => ({ ...item, state: 'completed', progress: { bytesTransferred: item.file.size, totalBytes: item.file.size, percentage: 100 } }))),
      cancel: vi.fn(), retry: vi.fn(), clearCompleted: () => setItems([]), clearAll: () => setItems([]),
      totalProgress: items.length && items.every(item => item.state === 'completed') ? 100 : 0,
    };
  },
}));
import RoleGuard from '../app/router/RoleGuard';
import AdminMediaUploadPage from '../pages/admin/AdminMediaUploadPage';

const App = () => <MemoryRouter initialEntries={['/admin/midias/upload']}><Routes><Route element={<RoleGuard role="admin" />}><Route path="/admin/midias/upload" element={<AdminMediaUploadPage />} /></Route><Route path="/cliente" element={<span>Área cliente</span>} /></Routes></MemoryRouter>;

describe('rota integrada de upload', () => {
  beforeEach(() => { role = 'admin'; vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() }); });
  afterEach(() => vi.unstubAllGlobals());
  it('admin escolhe cliente, adiciona arquivo e conclui upload mock', () => { render(<App />); fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'brand' } }); fireEvent.change(screen.getByLabelText('Escolher arquivos de mídia'), { target: { files: [new File(['x'], 'foto.jpg', { type: 'image/jpeg' })] } }); expect(screen.getByText('foto.jpg')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: /iniciar upload/i })); expect(screen.getByRole('status')).toHaveTextContent('Concluído'); expect(screen.getByRole('progressbar', { name: /progresso geral/i })).toHaveAttribute('aria-valuenow', '100'); });
  it('redireciona cliente para sua área', () => { role = 'client'; render(<App />); expect(screen.getByText('Área cliente')).toBeInTheDocument(); expect(screen.queryByText('Upload de mídias')).not.toBeInTheDocument(); });
});
