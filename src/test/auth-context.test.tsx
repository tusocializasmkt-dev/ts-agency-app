import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

const firebase = vi.hoisted(() => ({ authCallback: undefined as undefined | ((user: unknown) => Promise<void>), unsubscribe: vi.fn(), signOut: vi.fn(), getDoc: vi.fn(), profileCallback: undefined as undefined | ((snapshot: any) => void), snapshotUnsubscribe: vi.fn(), doc: vi.fn((_db, collection, id) => `${collection}/${id}`) }));
vi.mock('firebase/auth', () => ({ onAuthStateChanged: vi.fn((_auth, callback) => { firebase.authCallback = callback; return firebase.unsubscribe; }), signOut: firebase.signOut, User: class {} }));
vi.mock('firebase/firestore', () => ({ doc: firebase.doc, getDoc: firebase.getDoc, onSnapshot: vi.fn((_ref, callback) => { firebase.profileCallback = callback; return firebase.snapshotUnsubscribe; }) }));
vi.mock('../lib/firebase', () => ({ auth: {}, db: {} }));

const Probe = () => { const value = useAuth(); return <span>{value.loading ? 'loading' : `${value.role ?? 'none'}:${value.authError ?? ''}`}</span>; };
describe('AuthContext', () => {
  it('bloqueia administrador desativado mesmo que o documento exista', async () => {
    firebase.getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ active: false }) });
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(() => firebase.authCallback!({ uid: 'disabled-admin' }));
    expect(firebase.signOut).toHaveBeenCalled();
    expect(screen.queryByText('admin:')).not.toBeInTheDocument();
  });
  it('desativação em tempo real encerra sessão e limpa rota lembrada', async () => {
    localStorage.setItem('ts:last-route:live', '/admin');
    firebase.getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ active: true }) });
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(() => firebase.authCallback!({ uid: 'live', getIdToken: vi.fn().mockResolvedValue('test') }));
    await act(async () => firebase.profileCallback!({ exists: () => true, data: () => ({ active: false }) }));
    expect(firebase.signOut).toHaveBeenCalled(); expect(localStorage.getItem('ts:last-route:live')).toBeNull();
  });
  it('restaura sessão persistida quando o observer recebe usuário existente', async () => { firebase.getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({}) }); render(<AuthProvider><Probe /></AuthProvider>); await act(() => firebase.authCallback!({ uid: 'admin-a', getIdToken: vi.fn().mockResolvedValue('test') })); expect(screen.getByText('admin:')).toBeInTheDocument(); });
  it('não inventa papel, limpa logout e cancela listener', async () => {
    const { unmount } = render(<AuthProvider><Probe /></AuthProvider>); expect(screen.getByText('loading')).toBeInTheDocument();
    firebase.getDoc.mockResolvedValueOnce({ exists: () => false }).mockResolvedValueOnce({ exists: () => false }).mockResolvedValueOnce({ exists: () => false }); await act(() => firebase.authCallback!({ uid: 'u1' })); expect(screen.getByText(/none:Sua conta/)).toBeInTheDocument();
    await act(() => firebase.authCallback!(null)); expect(screen.getByText('none:')).toBeInTheDocument(); unmount(); expect(firebase.unsubscribe).toHaveBeenCalled();
  });
  it('ignora consulta de perfil que termina após unmount', async () => {
    let resolve!: (value: unknown) => void; firebase.getDoc.mockReturnValueOnce(new Promise(done => { resolve = done; })); const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const view = render(<AuthProvider><Probe /></AuthProvider>); let pending!: Promise<void>; await act(async () => { pending = firebase.authCallback!({ uid: 'u2' }); }); view.unmount(); await act(async () => { resolve({ exists: () => true, data: () => ({}) }); await pending; }); expect(consoleError).not.toHaveBeenCalled(); consoleError.mockRestore();
  });
  it('encerra a sessão somente quando o acesso está desativado', async () => {
    firebase.getDoc.mockResolvedValueOnce({ exists: () => false }).mockResolvedValueOnce({ exists: () => false }).mockResolvedValueOnce({ exists: () => true, data: () => ({ status: 'delinquent', accessEnabled: false }) });
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(() => firebase.authCallback!({ uid: 'cliente-a' }));
    expect(firebase.signOut).toHaveBeenCalled();
    await act(() => firebase.authCallback!(null));
    expect(screen.getByText(/none:Este acesso está desativado/)).toBeInTheDocument();
  });
  it('carrega equipe ativa com clientes atribuídos e bloqueia membro inativo', async () => {
    firebase.getDoc.mockResolvedValueOnce({ exists: () => false }).mockResolvedValueOnce({ exists: () => true, data: () => ({ role: 'manager', active: true, brandIds: ['a', 'b'] }) });
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(() => firebase.authCallback!({ uid: 'team-a', getIdToken: vi.fn().mockResolvedValue('test') }));
    expect(screen.getByText('manager:')).toBeInTheDocument();
    firebase.getDoc.mockResolvedValueOnce({ exists: () => false }).mockResolvedValueOnce({ exists: () => true, data: () => ({ role: 'social_media', active: false, brandIds: ['a'] }) });
    await act(() => firebase.authCallback!({ uid: 'team-b' }));
    expect(firebase.signOut).toHaveBeenCalled();
  });
});
