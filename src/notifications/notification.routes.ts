const allowed = ['/admin', '/admin/posts', '/admin/financeiro', '/admin/notificacoes', '/cliente', '/cliente/posts', '/cliente/financeiro', '/cliente/notificacoes'];
export function approvedPostDestination(notification: { type: string; entityId?: string; link?: string }): string | undefined {
  if (notification.type === 'post_approved' && notification.entityId && /^[a-zA-Z0-9_-]{1,128}$/.test(notification.entityId)
    && (notification.link === '/admin/posts' || notification.link === '/cliente/posts')) {
    return `${notification.link}?postId=${encodeURIComponent(notification.entityId)}`;
  }
  return notification.link && isAllowedNotificationRoute(notification.link) ? notification.link : undefined;
}
export function isAllowedNotificationRoute(value: string): boolean {
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('?') || value.includes('#')) return false;
  return allowed.includes(value) || /^\/cliente\/financeiro\/[a-zA-Z0-9_-]{1,128}\/pagar$/.test(value);
}
