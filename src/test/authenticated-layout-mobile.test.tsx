import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ role: 'admin' }) }));
vi.mock('../hooks/useNotifications', () => ({ useNotifications: () => ({ unreadCount: 0 }) }));
vi.mock('../hooks/useAgencyConfig', () => ({ useAgencyConfig: () => ({ config: { name: 'Minha Agência' } }) }));
vi.mock('../lib/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));

import AuthenticatedLayout from '../app/layouts/AuthenticatedLayout';

const renderLayout = () => render(<MemoryRouter initialEntries={['/admin']}><Routes><Route path="/admin" element={<AuthenticatedLayout />}><Route index element={<h1>Conteúdo</h1>} /><Route path="posts" element={<h1>Posts</h1>} /></Route></Routes></MemoryRouter>);

describe('layout autenticado responsivo', () => {
  afterEach(() => { document.body.style.overflow = ''; });

  it('abre e fecha o menu com estado acessível e Escape', async () => {
    renderLayout();
    const open = screen.getByRole('button', { name: 'Abrir menu de navegação' });
    expect(open).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(open);
    expect(open).toHaveAttribute('aria-expanded', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByRole('button', { name: 'Fechar menu de navegação' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(open).toHaveAttribute('aria-expanded', 'false'));
    expect(document.body.style.overflow).toBe('');
    await waitFor(() => expect(open).toHaveFocus());
  });

  it('fecha o drawer ao navegar por um item', async () => {
    renderLayout();
    const open = screen.getByRole('button', { name: 'Abrir menu de navegação' });
    fireEvent.click(open);
    fireEvent.click(screen.getByRole('link', { name: 'Feed' }));
    expect(await screen.findByRole('heading', { name: 'Posts' })).toBeInTheDocument();
    expect(open).toHaveAttribute('aria-expanded', 'false');
  });
});
