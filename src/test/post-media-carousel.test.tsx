import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FeedbackProvider from '../app/providers/FeedbackProvider';
const hook = vi.hoisted(() => ({ usePostMedia: vi.fn() }));
vi.mock('../hooks/usePostMedia', () => ({ usePostMedia: hook.usePostMedia }));
import PostMediaCarousel from '../components/media/PostMediaCarousel';
const post = { id: 'p' } as never;
const renderCarousel = () => render(<FeedbackProvider><PostMediaCarousel post={post} /></FeedbackProvider>);

describe('PostMediaCarousel', () => {
  beforeEach(() => vi.clearAllMocks());
  it('exibe imagem e download', () => { hook.usePostMedia.mockReturnValue({ media: [{ id: 'i', url: 'https://example.test/image', mediaType: 'image', name: 'Imagem', missing: false }], coverIndex: 0, loading: false }); renderCarousel(); expect(screen.getByAltText('Imagem')).toHaveAttribute('loading', 'lazy'); expect(screen.getByRole('button', { name: /baixar mídia imagem/i })).toBeInTheDocument(); });
  it('exibe vídeo interno sem autoplay', () => { hook.usePostMedia.mockReturnValue({ media: [{ id: 'v', url: 'https://example.test/video', mediaType: 'video', name: 'Vídeo', missing: false }], coverIndex: 0, loading: false }); renderCarousel(); const video = screen.getByLabelText('Vídeo'); expect(video).toHaveAttribute('controls'); expect(video).toHaveAttribute('preload', 'metadata'); expect(video).not.toHaveAttribute('autoplay'); });
  it('navega no carrossel a partir da capa sem mudar ordem', () => { hook.usePostMedia.mockReturnValue({ media: [{ id: 'a', url: 'https://example.test/a', mediaType: 'image', name: 'A', missing: false }, { id: 'b', url: 'https://example.test/b', mediaType: 'image', name: 'B', missing: false }], coverIndex: 1, loading: false }); renderCarousel(); expect(screen.getByText('2 / 2')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Mídia anterior' })); expect(screen.getByText('1 / 2')).toBeInTheDocument(); });
  it('mostra mídia ausente sem quebrar', () => { hook.usePostMedia.mockReturnValue({ media: [{ id: 'missing', name: 'Mídia indisponível', missing: true }], coverIndex: 0, loading: false }); renderCarousel(); expect(screen.getByRole('status')).toHaveTextContent('Mídia indisponível'); });
  it('preserva fallback legado resolvido pelo hook', () => { hook.usePostMedia.mockReturnValue({ media: [{ id: 'legacy', url: 'https://example.test/old', mediaType: 'image', name: 'Mídia do post 1', missing: false, legacy: true }], coverIndex: 0, loading: false }); renderCarousel(); expect(screen.getByAltText('Mídia do post 1')).toBeInTheDocument(); });
});
