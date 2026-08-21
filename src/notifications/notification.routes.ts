const allowed = ['/admin', '/admin/posts', '/admin/financeiro', '/admin/notificacoes', '/cliente', '/cliente/posts', '/cliente/financeiro', '/cliente/notificacoes'];
export function isAllowedNotificationRoute(value: string): boolean {
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('?') || value.includes('#')) return false;
  return allowed.includes(value) || /^\/cliente\/financeiro\/[a-zA-Z0-9_-]{1,128}\/pagar$/.test(value);
}
