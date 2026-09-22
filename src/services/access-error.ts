/** Only known error codes are translated; backend messages/details are never displayed. */
export function accessErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  switch (code) {
    case 'functions/already-exists': return 'Este e-mail já está em uso. Informe outro e-mail.';
    case 'functions/unauthenticated':
    case 'auth/user-token-expired':
    case 'auth/invalid-user-token': return 'Sua sessão expirou ou não está autenticada. Entre novamente.';
    case 'functions/permission-denied': return 'Você não tem permissão para administrar este acesso.';
    case 'functions/invalid-argument': {
      const details = (error as { details?: { reason?: string } }).details;
      return details?.reason === 'invalid-password'
        ? 'A senha não atende aos requisitos. Use entre 10 e 128 caracteres.'
        : 'Confira o nome, o e-mail e os requisitos da nova senha.';
    }
    case 'functions/failed-precondition': return 'Esta alteração não é permitida para o estado atual do acesso. Você não pode remover ou desativar o próprio administrador.';
    case 'functions/not-found': return 'O acesso não foi encontrado. Atualize a lista.';
    default: return 'Não foi possível concluir por um erro técnico. Tente novamente ou fale com o suporte.';
  }
}
