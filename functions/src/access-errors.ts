import { HttpsError } from 'firebase-functions/v2/https';

export function mapAccessError(error: unknown): HttpsError {
  if (error instanceof HttpsError) return error;
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  const message = error instanceof Error ? error.message : '';
  if (['self-access-removal', 'last-active-admin'].includes(message)) return new HttpsError('failed-precondition', 'Não é permitido remover ou desativar o próprio acesso ou o último administrador ativo.');
  if (code === 'auth/email-already-exists') return new HttpsError('already-exists', 'Este e-mail já possui uma conta.');
  if (code === 'auth/invalid-password' || message === 'invalid-access-password') return new HttpsError('invalid-argument', 'A nova senha precisa ter entre 10 e 128 caracteres.', { reason: 'invalid-password' });
  if (code === 'auth/invalid-email') return new HttpsError('invalid-argument', 'Confira o e-mail informado.');
  if (message === 'access-not-found') return new HttpsError('not-found', 'Acesso não encontrado.');
  if (message === 'invalid-access-command') return new HttpsError('invalid-argument', 'Confira os dados de acesso.');
  return new HttpsError('internal', 'Não foi possível concluir. Confira o estado do acesso antes de tentar novamente.');
}
