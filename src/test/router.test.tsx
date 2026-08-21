import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RootRedirect from '../app/router/RootRedirect';
import ProtectedRoute from '../app/router/ProtectedRoute';
import RoleGuard from '../app/router/RoleGuard';
import NotFoundPage from '../pages/public/NotFoundPage';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));
const auth = vi.mocked(useAuth);
const state = (overrides = {}) => ({ user: null, role: null, loading: false, authError: null, isAdmin: false, brandId: null, ...overrides } as ReturnType<typeof useAuth>);
const Location = () => { const location = useLocation(); return <span>{location.pathname}:{String(location.state?.from ?? '')}</span>; };

describe('router guards', () => {
  beforeEach(() => auth.mockReturnValue(state()));

  it.each([[null, '/login'], ['admin', '/admin'], ['client', '/cliente']] as const)('RootRedirect envia %s para %s', (role, destination) => {
    auth.mockReturnValue(state(role ? { user: {}, role } : {}));
    render(<MemoryRouter initialEntries={['/']}><Routes><Route path="/" element={<RootRedirect />} /><Route path="*" element={<Location />} /></Routes></MemoryRouter>);
    expect(screen.getByText(`${destination}:`)).toBeInTheDocument();
  });

  it('RootRedirect mantém loading e bloqueia perfil inválido', () => {
    auth.mockReturnValue(state({ loading: true }));
    const { rerender } = render(<MemoryRouter><RootRedirect /></MemoryRouter>);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    auth.mockReturnValue(state({ user: {}, authError: 'perfil inválido' }));
    rerender(<MemoryRouter><RootRedirect /></MemoryRouter>);
    expect(screen.getByText('perfil inválido')).toBeInTheDocument();
  });

  it('ProtectedRoute preserva origem e libera autenticado', () => {
    const view = render(<MemoryRouter initialEntries={['/privado']}><Routes><Route element={<ProtectedRoute />}><Route path="/privado" element={<span>segredo</span>} /></Route><Route path="/login" element={<Location />} /></Routes></MemoryRouter>);
    expect(screen.getByText('/login:/privado')).toBeInTheDocument();
    view.unmount();
    auth.mockReturnValue(state({ user: {}, role: 'admin' }));
    render(<MemoryRouter initialEntries={['/privado']}><Routes><Route element={<ProtectedRoute />}><Route path="/privado" element={<span>segredo</span>} /></Route></Routes></MemoryRouter>);
    expect(screen.getByText('segredo')).toBeInTheDocument();
  });

  it.each([['admin', 'admin', 'área'], ['client', 'client', 'área'], ['client', 'admin', '/cliente:'], ['admin', 'client', '/admin:']] as const)('RoleGuard: %s em %s', (role, allowed, expected) => {
    auth.mockReturnValue(state({ user: {}, role }));
    render(<MemoryRouter initialEntries={['/área']}><Routes><Route element={<RoleGuard role={allowed} />}><Route path="/área" element={<span>área</span>} /></Route><Route path="*" element={<Location />} /></Routes></MemoryRouter>);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it.each([[null, null, '/login'], [{}, 'admin', '/admin'], [{}, 'client', '/cliente']] as const)('NotFound aponta ao destino correto', (user, role, href) => {
    auth.mockReturnValue(state({ user, role }));
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByRole('link')).toHaveAttribute('href', href);
  });
});
