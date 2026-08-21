import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '../components/LoginPage';

const auth = vi.hoisted(() => ({ signInWithEmailAndPassword: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('firebase/auth', () => ({ signInWithEmailAndPassword: auth.signInWithEmailAndPassword }));
vi.mock('../lib/firebase', () => ({ auth: {} }));
vi.mock('../hooks', () => ({ useFeedback: () => ({ success: auth.success, error: auth.error }) }));

describe('login com Firebase Auth', () => {
  beforeEach(() => vi.clearAllMocks());
  it('autentica diretamente no Firebase Auth sem chamar Functions', async () => { auth.signInWithEmailAndPassword.mockResolvedValue({ user: { uid: 'admin-a' } }); render(<LoginPage />); fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: ' ADMIN@TESTE.LOCAL ' } }); fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'senha-segura-123' } }); fireEvent.click(screen.getByRole('button', { name: /entrar/i })); await waitFor(() => expect(auth.signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'ADMIN@TESTE.LOCAL', 'senha-segura-123')); expect(auth.success).toHaveBeenCalled(); });
  it('senha inválida não inicia sessão e mostra erro neutro', async () => { auth.signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/invalid-credential' }); render(<LoginPage />); fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'cliente@teste.local' } }); fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'errada' } }); fireEvent.click(screen.getByRole('button', { name: /entrar/i })); await waitFor(() => expect(auth.error).toHaveBeenCalledWith('E-mail ou senha inválidos.')); expect(auth.success).not.toHaveBeenCalled(); });
});
