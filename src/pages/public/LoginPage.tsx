import { Navigate, useLocation } from 'react-router-dom';
import LoginForm from '../../components/LoginPage';
import { useAuth } from '../../contexts/AuthContext';
import { AuthLoading, ProfileError } from '../../app/router/ProtectedRoute';
import { ROUTES } from '../../app/router/routes';

export default function LoginPage() {
  const { user, role, loading, authError } = useAuth();
  const location = useLocation();
  if (loading) return <AuthLoading />;
  if (!user) return <LoginForm />;
  if (authError || !role) return <ProfileError message={authError} />;
  const requested = (location.state as { from?: string } | null)?.from;
  const compatible = requested && (role === 'admin' ? requested.startsWith(ROUTES.admin.root) : requested.startsWith(ROUTES.client.root));
  return <Navigate to={compatible ? requested : role === 'admin' ? ROUTES.admin.root : ROUTES.client.root} replace />;
}
