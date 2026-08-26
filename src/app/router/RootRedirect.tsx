import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthLoading, ProfileError } from './ProtectedRoute';
import { ROUTES } from './routes';

export default function RootRedirect() {
  const { user, role, loading, authError } = useAuth();
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to={ROUTES.login} replace />;
  if (authError || !role) return <ProfileError message={authError} />;
  return <Navigate to={role === 'client' ? ROUTES.client.root : ROUTES.admin.root} replace />;
}
