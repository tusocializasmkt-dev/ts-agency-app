import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '../components/LoginPage';

const auth = vi.hoisted(() => ({ signInWithEmailAndPassword: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('firebase/auth', () => ({ signInWithEmailAndPassword: auth.signInWithEmailAndPassword, setPersistence: vi.fn().mockResolvedValue(undefined), browserLocalPersistence: 'local' }));
vi.mock('../lib/firebase', () => ({ auth: {} }));
vi.mock('../hooks', () => ({ useFeedback: () => ({ success: auth.success, error: auth.error }) }));

describe('login com Firebase Auth', () => {
  it('recuperação abre somente WhatsApp e não envia credenciais', () => {
    render(<LoginPage />);
    const link = screen.getByRole('link', { name: 'Esqueci minha senha' });
    expect(link).toHaveAttribute('target', '_blank');
    const url = new URL(link.getAttribute('href')!);
    expect(url.hostname).toBe('wa.me'); expect(url.pathname).toBe('/5511986237487');
    expect(url.searchParams.get('text')).toBe('Olá! Preciso de ajuda para recuperar meu acesso ao TS Agency.');
    expect(auth.signInWithEmailAndPassword).not.toHaveBeenCalled();
  });
  beforeEach(() => vi.clearAllMocks());
  it('falhas técnicas não são traduzidas como senha inválida', async () => {
    auth.signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/internal-error' });
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'admin@teste.local' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'example-only-123' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => expect(auth.error).toHaveBeenCalledWith('Não foi possível entrar. Tente novamente ou fale com o suporte.'));
  });
  it('autentica diretamente no Firebase Auth sem chamar Functions', async () => { auth.signInWithEmailAndPassword.mockResolvedValue({ user: { uid: 'admin-a' } }); render(<LoginPage />); fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: ' ADMIN@TESTE.LOCAL ' } }); fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'senha-segura-123' } }); fireEvent.click(screen.getByRole('button', { name: /entrar/i })); await waitFor(() => expect(auth.signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'ADMIN@TESTE.LOCAL', 'senha-segura-123')); expect(auth.success).toHaveBeenCalled(); });
  it('senha inválida não inicia sessão e mostra erro neutro', async () => { auth.signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/invalid-credential' }); render(<LoginPage />); fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'cliente@teste.local' } }); fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'errada' } }); fireEvent.click(screen.getByRole('button', { name: /entrar/i })); await waitFor(() => expect(auth.error).toHaveBeenCalledWith('E-mail ou senha inválidos.')); expect(auth.success).not.toHaveBeenCalled(); });
});
