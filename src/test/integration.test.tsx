import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ProtectedRoute from '../app/router/ProtectedRoute';
import RoleGuard from '../app/router/RoleGuard';
import AdminLayout from '../app/layouts/AdminLayout';
import ClientLayout from '../app/layouts/ClientLayout';
import ModalProvider from '../app/providers/ModalProvider';
import FeedbackProvider from '../app/providers/FeedbackProvider';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../hooks/useModal';
import { useFeedback } from '../hooks/useFeedback';
import toast from 'react-hot-toast';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() })); vi.mock('../lib/firebase', () => ({ auth: {}, db: {} })); vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));
vi.mock('../hooks/useNotifications', () => ({ useNotifications: () => ({ unreadCount: 0 }) }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(() => 'toast'), { success: vi.fn(() => 'success'), error: vi.fn(), dismiss: vi.fn() }), Toaster: () => <div /> }));
const auth = vi.mocked(useAuth); const authState = (role: 'admin' | 'client' | null, user: unknown = {}) => ({ user, role, loading: false, authError: null, isAdmin: role === 'admin', brandId: role === 'client' ? 'c' : null } as ReturnType<typeof useAuth>);
const Flow = ({ path }: { path: string }) => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/login" element={<span>Login público</span>} /><Route element={<ProtectedRoute />}><Route element={<RoleGuard role="admin" />}><Route path="/admin" element={<AdminLayout />}><Route index element={<span>Área admin</span>} /></Route></Route><Route element={<RoleGuard role="client" />}><Route path="/cliente" element={<ClientLayout />}><Route index element={<span>Área cliente</span>} /></Route></Route></Route></Routes></MemoryRouter>);

describe('fluxos integrados simplificados', () => {
  it('mantém público não autenticado no login', () => { auth.mockReturnValue(authState(null, null)); Flow({ path: '/login' }); expect(screen.getByText('Login público')).toBeInTheDocument(); });
  it('admin vê sidebar e é bloqueado na rota cliente', () => { auth.mockReturnValue(authState('admin')); const first = Flow({ path: '/admin' }); expect(screen.getByText('Área admin')).toBeInTheDocument(); expect(screen.getByRole('navigation')).toHaveTextContent('Clientes'); first.unmount(); Flow({ path: '/cliente' }); expect(screen.getByText('Área admin')).toBeInTheDocument(); });
  it('cliente vê sidebar e é bloqueado na rota admin', () => { auth.mockReturnValue(authState('client')); const first = Flow({ path: '/cliente' }); expect(screen.getByText('Área cliente')).toBeInTheDocument(); expect(screen.getByRole('navigation')).toHaveTextContent('Meu Perfil'); first.unmount(); Flow({ path: '/admin' }); expect(screen.getByText('Área cliente')).toBeInTheDocument(); });
  it('feedback e confirmação cancelam e confirmam', async () => { let outcome: Promise<boolean> | undefined; const Probe = () => { const modal = useModal(); const feedback = useFeedback(); return <><button onClick={() => feedback.success('feito')}>feedback</button><button onClick={() => { outcome = modal.confirm({ title: 'Decidir' }); }}>modal</button></>; }; render(<ModalProvider><FeedbackProvider><Probe /></FeedbackProvider></ModalProvider>); fireEvent.click(screen.getByText('feedback')); expect(toast.success).toHaveBeenCalledWith('feito', expect.anything()); fireEvent.click(screen.getByText('modal')); fireEvent.click(screen.getByText('Cancelar')); await expect(outcome).resolves.toBe(false); fireEvent.click(screen.getByText('modal')); fireEvent.click(screen.getByText('Confirmar')); await expect(outcome).resolves.toBe(true); });
});
