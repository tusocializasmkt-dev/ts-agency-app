import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MediaCard from '../components/media/MediaCard';
import MediaDetailsPanel from '../components/media/MediaDetailsPanel';
import type { MediaAsset } from '../media';

const asset = (mediaType: 'image' | 'video' = 'image', mimeType = 'image/jpeg', status: MediaAsset['status'] = 'ready'): MediaAsset => ({ id: 'm', brandId: 'b', fileName: 'stored.jpg', originalFileName: 'Original.jpg', mediaType, category: 'feed', mimeType, sizeBytes: 2048, storagePath: 'brands/b/media/m/stored.jpg', downloadUrl: 'https://example.test/file', status, source: 'upload', createdAt: new Date('2026-01-02T00:00:00Z') });

describe('MediaCard', () => {
  it('mostra dados, preview, status e ação', () => { const view = vi.fn(); const remove = vi.fn(); render(<MediaCard asset={asset()} brandName="Marca B" onView={view} onDelete={remove} onRestore={vi.fn()} />); expect(screen.getByAltText(/Preview de Original/)).toHaveAttribute('loading', 'lazy'); expect(screen.getByText('Marca B · Imagem')).toBeInTheDocument(); expect(screen.getByRole('status')).toHaveTextContent('Pronto'); fireEvent.click(screen.getByRole('button', { name: /mover original.*lixeira/i })); expect(remove).toHaveBeenCalled(); });
  it('restaura excluído', () => { const restore = vi.fn(); render(<MediaCard asset={asset('image', 'image/jpeg', 'deleted')} brandName="Marca" onView={vi.fn()} onDelete={vi.fn()} onRestore={restore} />); fireEvent.click(screen.getByRole('button', { name: /restaurar/i })); expect(restore).toHaveBeenCalled(); });
});

describe('MediaDetailsPanel', () => {
  it('mostra imagem e detalhes e fecha', () => { const close = vi.fn(); render(<MediaDetailsPanel asset={asset()} brandName="Marca B" onClose={close} onDelete={vi.fn()} onRestore={vi.fn()} />); expect(screen.getByAltText(/Preview ampliado/)).toBeInTheDocument(); expect(screen.getByText('stored.jpg')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Fechar' })); expect(close).toHaveBeenCalled(); });
  it('mostra vídeo sem autoplay', () => { render(<MediaDetailsPanel asset={asset('video', 'video/mp4')} brandName="Marca" onClose={vi.fn()} onDelete={vi.fn()} onRestore={vi.fn()} />); const video = screen.getByLabelText(/Vídeo Original/); expect(video).toHaveAttribute('controls'); expect(video).not.toHaveAttribute('autoplay'); });
  it('representa PDF sem renderização inline', () => { const pdf = { ...asset(), mimeType: 'application/pdf', downloadUrl: undefined }; render(<MediaDetailsPanel asset={pdf} brandName="Marca" onClose={vi.fn()} onDelete={vi.fn()} onRestore={vi.fn()} />); expect(screen.getByText('Documento PDF')).toBeInTheDocument(); });
  it('bloqueia exclusão permanente de item excluído', () => { render(<MediaDetailsPanel asset={asset('image', 'image/jpeg', 'deleted')} brandName="Marca" onClose={vi.fn()} onDelete={vi.fn()} onRestore={vi.fn()} />); expect(screen.getByText('Exclusão permanente bloqueada')).toBeInTheDocument(); expect(screen.getByText(/Verificação de uso indisponível/)).toBeInTheDocument(); });
});
