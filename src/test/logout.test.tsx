import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
const signOut = vi.hoisted(() => vi.fn());
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ role: 'admin' }) }));
vi.mock('../hooks/useNotifications', () => ({ useNotifications: () => ({ unreadCount: 0 }) }));
vi.mock('../lib/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({ signOut }));
import Sidebar from '../components/Sidebar';

describe('logout', () => { it('encerra completamente a sessão do Firebase Auth', () => { render(<MemoryRouter><Sidebar /></MemoryRouter>); fireEvent.click(screen.getByRole('button', { name: /sair/i })); expect(signOut).toHaveBeenCalledWith(expect.anything()); }); });
