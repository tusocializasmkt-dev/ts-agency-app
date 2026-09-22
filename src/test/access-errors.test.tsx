import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import AccessEditor from '../components/auth/AccessEditor';
import { accessErrorMessage } from '../services/access-error';

it.each([
  [{ code: 'functions/already-exists' }, 'Este e-mail já está em uso. Informe outro e-mail.'],
  [{ code: 'functions/invalid-argument', details: { reason: 'invalid-password' } }, 'A senha não atende aos requisitos. Use entre 10 e 128 caracteres.'],
  [{ code: 'functions/permission-denied' }, 'Você não tem permissão para administrar este acesso.'],
  [{ code: 'functions/unauthenticated' }, 'Sua sessão expirou ou não está autenticada. Entre novamente.'],
  [{ code: 'functions/internal', message: 'sensitive backend detail' }, 'Não foi possível concluir por um erro técnico. Tente novamente ou fale com o suporte.'],
])('creation dialog presents a safe distinct error for %j', async (error, message) => {
  const save = vi.fn().mockRejectedValue(error);
  render(<AccessEditor creating processing={false} onClose={vi.fn()} onSave={save} />);
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Admin Test' } });
  fireEvent.change(screen.getByLabelText('E-mail de acesso'), { target: { value: 'admin@example.test' } });
  fireEvent.change(screen.getByLabelText('Senha inicial'), { target: { value: 'example-only-123' } });
  fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'example-only-123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar e salvar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(message);
  expect(screen.queryByText('sensitive backend detail')).not.toBeInTheDocument();
});

it('does not reveal unknown messages or details', () => {
  expect(accessErrorMessage({ code: 'unknown', message: 'secret', details: 'secret' })).not.toContain('secret');
  expect(accessErrorMessage(null)).toContain('erro técnico');
});
