import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
const hooks = vi.hoisted(() => ({ usePosts: vi.fn(), useBrands: vi.fn(), useFeedback: vi.fn() }));
vi.mock('../hooks', () => ({ usePosts: hooks.usePosts, useBrands: hooks.useBrands, useFeedback: hooks.useFeedback }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'b' }, role: 'client' }) }));
vi.mock('../components/media', () => ({ PostMediaCarousel: () => <a href="https://example.test/media" download>Baixar mídia</a> }));
import FeedView from '../components/FeedView';

describe('Feed cliente com mídia', () => {
  it('permite visualizar e baixar sem controles de edição', () => { hooks.usePosts.mockReturnValue({ posts: [{ id: 'p', brandId: 'b', type: 'feed', socialNetwork: 'instagram', caption: 'Conteúdo', scheduledDate: '2026-01-01T00:00:00Z', status: 'pending', mediaIds: ['m'] }], loading: false, approve: vi.fn(), reject: vi.fn(), requestChanges: vi.fn(), create: vi.fn(), update: vi.fn() }); hooks.useBrands.mockReturnValue({ brands: [] }); hooks.useFeedback.mockReturnValue({ success: vi.fn(), error: vi.fn() }); render(<FeedView selectedBrandId="b" isAdmin={false} />); expect(screen.getByText('Conteúdo')).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Baixar mídia' })).toBeInTheDocument(); expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument(); expect(screen.queryByText('Novo Post')).not.toBeInTheDocument(); });
});
