import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const hooks = vi.hoisted(() => ({
  usePosts: vi.fn(() => ({ posts: [{ id: 'post-1', brandId: 'client-a', caption: 'Conteúdo do cliente', socialNetwork: 'instagram', type: 'feed', status: 'pending', scheduledDate: '2026-08-26T12:00:00.000Z' }], create: vi.fn(), update: vi.fn(), remove: vi.fn() })),
  useBrands: vi.fn(() => ({ brands: [] })),
  useFeedback: vi.fn(() => ({ success: vi.fn(), error: vi.fn() })),
}));
vi.mock('../hooks', () => hooks);
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'client-a' }, role: 'client', isAdmin: false }) }));
vi.mock('../components/Admin/PostModal', () => ({ default: () => <div>Editor administrativo</div> }));
vi.mock('../components/media', () => ({ PostMediaCarousel: () => <button>Baixar mídia</button> }));

import CalendarView from '../components/CalendarView';

describe('calendário do cliente', () => {
  it('abre detalhes somente leitura sem editor administrativo', () => {
    render(<CalendarView selectedBrandId="client-a" isAdmin={false} />);
    fireEvent.click(screen.getByText('Conteúdo do cliente'));
    const dayDialog = screen.getByRole('dialog', { name: /Posts de/i });
    fireEvent.click(within(dayDialog).getByText('Conteúdo do cliente'));
    expect(screen.getByRole('dialog', { name: 'Detalhes do conteúdo' })).toBeInTheDocument();
    expect(screen.getByText('Baixar mídia')).toBeInTheDocument();
    expect(screen.queryByText('Editor administrativo')).not.toBeInTheDocument();
    expect(screen.queryByText('Novo post')).not.toBeInTheDocument();
  });
});
