import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PasswordInput from '../components/auth/PasswordInput';
import { supportUrl } from '../config/support';
import { allowedRoute, clearLastRoute, lastRoute, rememberRoute } from '../app/router/last-route';
import { signIn } from '../services/auth-session.service';

const firebase = vi.hoisted(() => ({ persistence: vi.fn().mockResolvedValue(undefined), signIn: vi.fn().mockResolvedValue({ user: {} }) }));
vi.mock('firebase/auth', () => ({ browserLocalPersistence: 'local', setPersistence: firebase.persistence, signInWithEmailAndPassword: firebase.signIn }));
vi.mock('../lib/firebase', () => ({ auth: 'auth' }));

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
describe('Bloco 8E', () => {
  it('eye toggles by keyboard without changing or submitting the password', async () => {
    const submit = vi.fn(e => e.preventDefault());
    render(<form onSubmit={submit}><PasswordInput aria-label="Senha" defaultValue="test-only 123" /></form>);
    const input = screen.getByLabelText('Senha');
    expect(input).toHaveAttribute('type', 'password');
    screen.getByRole('button', { name: 'Mostrar senha' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(input).toHaveAttribute('type', 'text'); expect(input).toHaveValue('test-only 123');
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(input).toHaveAttribute('type', 'password'); expect(submit).not.toHaveBeenCalled();
  });
  it('WhatsApp uses the official number and only fixed non-sensitive messages', () => {
    for (const context of ['support','recovery'] as const) { const url = new URL(supportUrl(context)); expect(url.hostname).toBe('wa.me'); expect(url.pathname).toBe('/5511986237487'); expect(url.searchParams.get('text')).toContain('TS Agency'); expect(url.searchParams.get('text')).not.toMatch(/uid|token|password|@/i); }
    expect(new URL(supportUrl('recovery')).searchParams.get('text')).toContain('recuperar meu acesso');
  });
  it('sets Firebase local persistence before signing in and preserves password whitespace', async () => {
    await signIn(' user@example.test ', ' password 123 ');
    expect(firebase.persistence).toHaveBeenCalledWith('auth', 'local');
    expect(firebase.signIn).toHaveBeenCalledWith('auth', 'user@example.test', ' password 123 ');
    expect(firebase.persistence.mock.invocationCallOrder[0]).toBeLessThan(firebase.signIn.mock.invocationCallOrder[0]);
  });
  it('stores only pathname per user and removes it on logout', () => {
    rememberRoute('a','admin','/admin/clientes/brand-a',[]);
    expect(lastRoute('a','admin',[])).toBe('/admin/clientes/brand-a');
    expect(lastRoute('b','admin',[])).toBe('/admin');
    expect(localStorage.getItem('ts:last-route:a')).toBe('/admin/clientes/brand-a');
    clearLastRoute('a'); expect(lastRoute('a','admin',[])).toBe('/admin');
  });
  it('cannot restore financial/admin access after role or brand assignment changes', () => {
    rememberRoute('a','admin','/admin/financeiro',[]);
    expect(lastRoute('a','manager',['brand-a'])).toBe('/admin');
    rememberRoute('a','manager','/admin/clientes/brand-a',['brand-a']);
    expect(lastRoute('a','manager',[])).toBe('/admin');
    expect(lastRoute('a','client',[])).toBe('/cliente');
    for (const path of ['/admin/equipe','/admin/administradores','/admin/configuracoes','/admin/lixeira']) expect(allowedRoute(path,'social_media',[])).toBe(false);
  });
  it('rejects external, unknown, encoded and sensitive-query routes', () => {
    for (const path of ['https://example.test','//example.test','/admin/unknown','/admin?token=abc','/admin/clientes/../financeiro','/admin/clientes/%2e']) expect(allowedRoute(path,'admin',[])).toBe(false);
    expect(allowedRoute('/admin/posts','manager',[])).toBe(true);
  });
});
