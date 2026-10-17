import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ loadPost: vi.fn(), read: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../services/posts.service', () => ({ loadPost: state.loadPost }));
vi.mock('../components/FeedView', () => ({ default: () => <div>Fila principal</div> }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ isTeamMember: false, brandIds: ['b'], brandId: 'b' }) }));
vi.mock('../components/media', () => ({ PostMediaCarousel: () => <span>Mídia original</span> }));
vi.mock('../components/posts/PostDecisionHistory', () => ({ default: () => null }));
import NotificationItem from '../components/notifications/NotificationItem';
import AdminPostsPage from '../pages/admin/AdminPostsPage';
import ClientPostsPage from '../pages/client/ClientPostsPage';
import { approvedPostDestination } from '../notifications/notification.routes';
beforeEach(() => { vi.clearAllMocks(); state.loadPost.mockResolvedValue({ id: 'posted', brandId: 'b', status: 'approved', published: true, caption: 'Legenda original', scheduledDate: '2026-10-17', type: 'feed' }); });
describe('notificação abre publicação específica', () => {
  it.each(['/admin/posts', '/cliente/posts'])('abre post já publicado em %s sem desmarcar', async link => {
    render(<MemoryRouter initialEntries={['/notifications']}><Routes>
      <Route path="/notifications" element={<NotificationItem notification={{ id: 'n', type: 'post_approved', title: 'Aprovado', message: 'Publicação aprovada', recipientUid: 'u', source: 'system', entityId: 'posted', link }} onRead={state.read} />} />
      <Route path="/admin/posts" element={<AdminPostsPage />} /><Route path="/cliente/posts" element={<ClientPostsPage />} />
    </Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(await screen.findByRole('dialog', { name: 'Detalhes da publicação' })).toBeInTheDocument();
    expect(await screen.findByText('Legenda original')).toBeInTheDocument();
    expect(screen.getByText('POSTADO')).toBeInTheDocument();
    expect(screen.getByText('Mídia original')).toBeInTheDocument();
    expect(state.loadPost).toHaveBeenCalledWith('posted');
    expect(screen.queryByRole('button', { name: /Desmarcar/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar diálogo' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
  it('apresenta indisponibilidade sem revelar dados sem permissão', async () => {
    state.loadPost.mockRejectedValue(new Error('permission-denied'));
    render(<MemoryRouter initialEntries={['/admin/posts?postId=private']}><AdminPostsPage /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('não está disponível ou você não tem permissão');
    expect(screen.queryByText('Legenda original')).not.toBeInTheDocument();
  });
  it('preserva outros destinos e bloqueia URLs e IDs indevidos', () => {
    expect(approvedPostDestination({ type: 'post_created', link: '/cliente/posts', entityId: 'p' })).toBe('/cliente/posts');
    expect(approvedPostDestination({ type: 'manual', link: 'https://externo.test' })).toBeUndefined();
    expect(approvedPostDestination({ type: 'post_approved', link: '/admin/posts', entityId: '../private' })).toBe('/admin/posts');
    expect(approvedPostDestination({ type: 'post_approved', link: '//externo.test', entityId: 'p' })).toBeUndefined();
  });
});
