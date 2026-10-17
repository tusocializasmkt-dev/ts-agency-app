import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Post } from '../types';
const state = vi.hoisted(() => ({ loading: false, error: null as string | null }));
const posts: Post[] = [
  { id: 'a', brandId: 'b', title: 'Lançamento de verão', caption: 'Coleção exclusiva', status: 'approved', scheduledDate: '2026-10-17', type: 'feed', socialNetwork: 'instagram' },
  { id: 'b', brandId: 'b', caption: 'Promoção especial de verão', status: 'approved', published: true, scheduledDate: '2026-10-16', type: 'feed', socialNetwork: 'instagram' },
];
vi.mock('../hooks', () => ({ usePosts: () => ({ posts, ...state }), useBrands: () => ({ brands: [] }), useFeedback: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'b' }, role: 'client' }) }));
vi.mock('../components/media', () => ({ PostMediaCarousel: () => null }));
vi.mock('../components/posts', () => ({ PostDecisionDialog: () => null, PostDecisionHistory: () => null }));
vi.mock('../components/Admin/PostModal', () => ({ default: () => null }));
import FeedView from '../components/FeedView';
import { matchesPostSearch } from '../posts/feed-filter';
beforeEach(() => { state.loading = false; state.error = null; });
describe('pesquisa do Feed', () => {
  it('pesquisa título e legenda sem acentos, por todas as palavras e sem alterar os posts', () => {
    expect(matchesPostSearch(posts[0], ' LANCAMENTO colecao ')).toBe(true);
    expect(matchesPostSearch(posts[0], 'inexistente')).toBe(false);
    expect(matchesPostSearch(posts[1], 'PROMOCAO')).toBe(true);
    expect(posts[0].title).toBe('Lançamento de verão');
  });
  it('combina busca com filtros e permite encontrar postadas', () => {
    render(<FeedView selectedBrandId="b" isAdmin={false} />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Pesquisar publicações' }), { target: { value: 'PROMOCAO' } });
    expect(screen.getByText('Nenhuma publicação encontrada.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filtrar por status'), { target: { value: 'published' } });
    expect(screen.getByText('Promoção especial de verão')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filtrar por rede social'), { target: { value: 'facebook' } });
    expect(screen.getByText('Nenhuma publicação encontrada.')).toBeInTheDocument();
  });
  it('informa carregamento e falha de pesquisa incompleta', () => {
    state.loading = true;
    const { rerender } = render(<FeedView selectedBrandId="b" isAdmin={false} />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando publicações');
    state.loading = false; state.error = 'Não foi possível carregar os posts.';
    rerender(<FeedView selectedBrandId="b" isAdmin={false} />);
    expect(screen.getByRole('alert')).toHaveTextContent('A pesquisa pode estar incompleta');
  });
});
