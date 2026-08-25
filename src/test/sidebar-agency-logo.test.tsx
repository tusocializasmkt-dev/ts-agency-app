import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
let logoUrl: string | undefined;
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ role: 'admin' }) }));
vi.mock('../hooks/useNotifications', () => ({ useNotifications: () => ({ unreadCount: 0 }) }));
vi.mock('../hooks/useAgencyConfig', () => ({ useAgencyConfig: () => ({ config: { name: 'Minha Agência', logoUrl }, loading: false }) }));
vi.mock('../lib/firebase', () => ({ auth: {} })); vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));
import Sidebar from '../components/Sidebar';
describe('identidade da agência na sidebar', () => {
  beforeEach(() => { logoUrl = undefined; });
  it('usa fallback em configurações antigas sem logo', () => { render(<MemoryRouter><Sidebar /></MemoryRouter>); expect(screen.getByText('TS Agency')).toBeInTheDocument(); });
  it('mostra o logo sem forçar proporção quando logoUrl existe', () => { logoUrl = 'https://agency.test/horizontal.png'; render(<MemoryRouter><Sidebar /></MemoryRouter>); const logo = screen.getByAltText('Logotipo Minha Agência'); expect(logo).toHaveAttribute('src', logoUrl); expect(logo).toHaveClass('object-contain'); expect(logo).not.toHaveClass('rounded-full'); expect(screen.queryByRole('heading', { name: 'TS Agency' })).not.toBeInTheDocument(); });
});
