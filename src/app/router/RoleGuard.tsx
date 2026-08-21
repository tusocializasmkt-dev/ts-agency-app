import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';
import { ROUTES } from './routes';
import { AuthLoading, ProfileError } from './ProtectedRoute';

export default function RoleGuard({ role: allowedRole }: { role: UserRole }) {
  const { role, loading, authError } = useAuth();
  if (loading) return <AuthLoading />;
  if (authError || !role) return <ProfileError message={authError} />;
  if (role !== allowedRole) return <Navigate to={role === 'admin' ? ROUTES.admin.root : ROUTES.client.root} replace />;
  return <Outlet />;
}
