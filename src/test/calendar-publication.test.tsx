import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../hooks', () => ({
  usePosts: () => ({ posts: [{ id: 'posted', caption: 'Legenda preservada', brandId: 'b', status: 'approved', published: true, scheduledDate: '2026-10-17T12:00:00', socialNetwork: 'instagram', type: 'carousel' }] }),
  useBrands: () => ({ brands: [] }), useFeedback: () => ({}),
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ role: 'client', user: { uid: 'b' } }) }));
vi.mock('../components/media', () => ({ PostMediaCarousel: () => <span>Arquivo original</span> }));
vi.mock('../components/Admin/PostModal', () => ({ default: () => null }));
import CalendarView from '../components/CalendarView';
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-15T12:00:00')); });
afterEach(() => vi.useRealTimers());
describe('Calendário preserva postagens publicadas', () => {
  it('mantém etiqueta, legenda, aprovação e arquivo nos detalhes do cliente', () => {
    render(<CalendarView selectedBrandId="b" isAdmin={false} />);
    expect(screen.getByText('POSTADO')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Legenda preservada'));
    const day = screen.getByRole('dialog', { name: /Posts de/ });
    expect(within(day).getByText(/Carrossel · Aprovado · POSTADO/)).toBeInTheDocument();
    fireEvent.click(within(day).getByText('Legenda preservada'));
    const details = screen.getByRole('dialog', { name: 'Detalhes do conteúdo' });
    expect(within(details).getByText('Arquivo original')).toBeInTheDocument();
    expect(within(details).getByText('POSTADO')).toBeInTheDocument();
    expect(within(details).getByText('Aprovado')).toBeInTheDocument();
    expect(screen.queryByText('approved')).not.toBeInTheDocument();
  });
});
