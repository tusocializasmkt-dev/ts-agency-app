import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ role: 'client', dismiss: vi.fn(), next: undefined as undefined | ((items: unknown[]) => void) }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ role: state.role, user: { uid: 'client' } }) }));
vi.mock('../communications/service', () => ({ watchPopups: (_uid: string, next: (items: unknown[]) => void) => { state.next = next; next([{ id: 'communication', title: 'Novidade', message: 'Mensagem completa', popup: true, type: 'communication' }]); return () => {}; }, dismissPopup: state.dismiss }));
import AnnouncementPopup from '../communications/AnnouncementPopup';
beforeEach(() => { localStorage.clear(); state.role = 'client'; state.dismiss.mockReset().mockResolvedValue(undefined); });
it('fecha imediatamente, persiste dispensa e não reapresenta ao entrar novamente', async () => {
  const view = render(<MemoryRouter><AnnouncementPopup /></MemoryRouter>);
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Dispensar' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(state.dismiss).toHaveBeenCalledWith('communication');
  view.unmount(); render(<MemoryRouter><AnnouncementPopup /></MemoryRouter>);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('não mostra pop-ups a equipe/admin e permite fechar mesmo sem rede', async () => {
  state.role = 'admin'; const view = render(<MemoryRouter><AnnouncementPopup /></MemoryRouter>);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); view.unmount();
  state.role = 'client'; state.dismiss.mockRejectedValue(new Error('offline'));
  render(<MemoryRouter><AnnouncementPopup /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Dispensar' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
