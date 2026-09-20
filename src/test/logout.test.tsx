import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
const signOut = vi.hoisted(() => vi.fn());
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ role: 'admin', user: { uid: 'admin' } }) }));
vi.mock('../hooks/useNotifications', () => ({ useNotifications: () => ({ unreadCount: 0 }) }));
vi.mock('../hooks/useAgencyConfig', () => ({ useAgencyConfig: () => ({ config: {} }) }));
vi.mock('../lib/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({ signOut }));
import Sidebar from '../components/Sidebar';

describe('logout', () => { it('encerra completamente a sessão do Firebase Auth', () => { localStorage.setItem('ts:last-route:admin','/admin/financeiro'); render(<MemoryRouter><Sidebar /></MemoryRouter>); fireEvent.click(screen.getByRole('button', { name: /sair/i })); expect(signOut).toHaveBeenCalledWith(expect.anything()); expect(localStorage.getItem('ts:last-route:admin')).toBeNull(); const url = new URL(screen.getByRole('link', { name: 'Suporte' }).getAttribute('href')!); expect(url.pathname).toBe('/5511986237487'); expect(url.searchParams.get('text')).toBe('Olá! Preciso de suporte com o TS Agency.'); }); });
