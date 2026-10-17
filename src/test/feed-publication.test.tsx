import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ role: 'admin', brandIds: ['b'], setPublished: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'actor' }, role: state.role, brandIds: state.brandIds }) }));
vi.mock('../hooks', () => ({
  useBrands: () => ({ brands: [] }), useFeedback: () => ({ success: vi.fn(), error: vi.fn() }),
  usePosts: () => ({ loading: false, setPublished: state.setPublished, posts: [
    { id: 'ready', brandId: 'b', status: 'approved', caption: 'Aguardando publicação', scheduledDate: '2026-10-17', type: 'feed' },
    { id: 'posted', brandId: 'b', status: 'approved', caption: 'Conteúdo publicado', scheduledDate: '2026-10-17', type: 'feed', published: true },
  ] }),
}));
vi.mock('../components/media', () => ({ PostMediaCarousel: () => null }));
vi.mock('../components/posts', () => ({ PostDecisionDialog: () => null, PostDecisionHistory: () => null }));
vi.mock('../components/Admin/PostModal', () => ({ default: () => null }));
import FeedView from '../components/FeedView';
afterEach(() => { cleanup(); vi.clearAllMocks(); state.role = 'admin'; state.brandIds = ['b']; });
describe('publicação no Feed', () => {
  it('marca e recupera a publicação pelo filtro', async () => {
    render(<FeedView selectedBrandId="b" isAdmin />);
    expect(screen.queryByText('Conteúdo publicado')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como postado' }));
    await waitFor(() => expect(state.setPublished).toHaveBeenCalledWith('ready', true));
    fireEvent.change(screen.getByLabelText('Filtrar por status'), { target: { value: 'published' } });
    expect(screen.getByText('POSTADO')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Desmarcar como postado' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Desmarcar como postado' }));
    await waitFor(() => expect(state.setPublished).toHaveBeenCalledWith('posted', false));
  });
  it.each(['client', 'social_media', 'manager'])('não oferece ação para %s sem autorização da marca', role => {
    state.role = role; state.brandIds = [];
    render(<FeedView selectedBrandId="b" isAdmin={false} />);
    expect(screen.queryByRole('button', { name: 'Marcar como postado' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filtrar por status'), { target: { value: 'published' } });
    expect(screen.getByText('POSTADO')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desmarcar como postado' })).not.toBeInTheDocument();
  });
});
