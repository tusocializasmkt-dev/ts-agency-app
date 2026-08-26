import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';
import { ROUTES } from './routes';
import { AuthLoading, ProfileError } from './ProtectedRoute';

export default function RoleGuard({ role: allowedRole, roles }: { role?: UserRole; roles?: UserRole[] }) {
  const { role, loading, authError } = useAuth();
  if (loading) return <AuthLoading />;
  if (authError || !role) return <ProfileError message={authError} />;
  const allowed = roles ?? (allowedRole ? [allowedRole] : []);
  if (!allowed.includes(role)) return <Navigate to={role === 'client' ? ROUTES.client.root : ROUTES.admin.root} replace />;
  return <Outlet />;
}
