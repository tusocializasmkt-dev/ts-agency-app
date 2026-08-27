import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({ role: 'admin' as 'admin' | 'manager' | 'social_media' | 'client' }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ role: authState.role }) }));
vi.mock('../hooks/useNotifications', () => ({ useNotifications: () => ({ unreadCount: 0 }) }));
vi.mock('../hooks/useAgencyConfig', () => ({ useAgencyConfig: () => ({ config: {} }) }));
vi.mock('../lib/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));

import Sidebar from '../components/Sidebar';

describe('menu por perfil', () => {
  it('admin vê Equipe e Financeiro', () => { authState.role = 'admin'; render(<MemoryRouter><Sidebar /></MemoryRouter>); expect(screen.getByText('Equipe')).toBeInTheDocument(); expect(screen.getByText('Financeiro')).toBeInTheDocument(); });
  it.each(['manager', 'social_media'] as const)('%s vê operação sem Equipe ou Financeiro', role => { authState.role = role; render(<MemoryRouter><Sidebar /></MemoryRouter>); expect(screen.getByText('Clientes')).toBeInTheDocument(); expect(screen.queryByText('Equipe')).not.toBeInTheDocument(); expect(screen.queryByText('Financeiro')).not.toBeInTheDocument(); expect(screen.queryByText('Configurações')).not.toBeInTheDocument(); });
  it('cliente vê Clientes, Mídias e não vê itens administrativos', () => { authState.role = 'client'; render(<MemoryRouter><Sidebar /></MemoryRouter>); expect(screen.getByText('Mídias')).toBeInTheDocument(); expect(screen.getByText('Minha Empresa')).toBeInTheDocument(); expect(screen.getByText('Clientes')).toBeInTheDocument(); expect(screen.queryByText('Vitrine')).not.toBeInTheDocument(); expect(screen.queryByText('Equipe')).not.toBeInTheDocument(); expect(screen.queryByText('Lixeira')).not.toBeInTheDocument(); });
});
