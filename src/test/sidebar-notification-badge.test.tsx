import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ unreadCount: 0 }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ role: 'client' }) }));
vi.mock('../hooks/useNotifications', () => ({ useNotifications: () => ({ unreadCount: state.unreadCount }) }));
vi.mock('../lib/firebase', () => ({ auth: {} })); vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));
import Sidebar from '../components/Sidebar';
describe('badge de notificações', () => { it.each([[0, null], [1, '1'], [99, '99'], [100, '99+']] as const)('formata %s não lidas', (count, expected) => { state.unreadCount = count; const view = render(<MemoryRouter><Sidebar /></MemoryRouter>); if (expected) expect(screen.getByLabelText(`${count} notificações não lidas`)).toHaveTextContent(expected); else expect(screen.queryByLabelText(/notificações não lidas/)).not.toBeInTheDocument(); view.unmount(); }); });
