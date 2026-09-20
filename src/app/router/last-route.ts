import type { UserRole } from '../../types';
import { ROUTES } from './routes';

const key = (uid: string) => `ts:last-route:${uid}`;
export const dashboardFor = (role: UserRole) => role === 'client' ? ROUTES.client.root : ROUTES.admin.root;
export function allowedRoute(path: string, role: UserRole, brandIds: string[] = []) {
  if (!path || path.includes('?') || path.includes('#') || path.includes('%') || path.includes('..')) return false;
  const routes = role === 'client' ? ROUTES.client : ROUTES.admin;
  const known = Object.values(routes).filter((value): value is string => typeof value === 'string' && !value.includes(':'));
  if (known.includes(path)) return role === 'client' || role === 'admin' || ![ROUTES.admin.finance, ROUTES.admin.trash, ROUTES.admin.settings, ROUTES.admin.team, ROUTES.admin.access].includes(path as never);
  const match = /^\/admin\/clientes\/([a-zA-Z0-9_-]{1,128})$/.exec(path);
  return Boolean(match && role !== 'client' && (role === 'admin' || brandIds.includes(match[1])));
}
export function clearLastRoute(uid: string) { try { localStorage.removeItem(key(uid)); } catch { /* Storage may be unavailable. */ } }
export function rememberRoute(uid: string, role: UserRole, path: string, brandIds: string[]) {
  if (allowedRoute(path, role, brandIds)) try { localStorage.setItem(key(uid), path); } catch { /* Navigation remains available. */ }
}
export function lastRoute(uid: string, role: UserRole, brandIds: string[]) {
  try { const path = localStorage.getItem(key(uid)); if (path && allowedRoute(path, role, brandIds)) return path; } catch { /* Use dashboard. */ }
  return dashboardFor(role);
}
