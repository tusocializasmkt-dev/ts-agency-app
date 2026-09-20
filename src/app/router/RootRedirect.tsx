import ResumeRoute from './ResumeRoute';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthLoading, ProfileError } from './ProtectedRoute';
import { ROUTES } from './routes';

export default function RootRedirect() {
  const { user, role, loading, authError, brandIds } = useAuth();
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to={ROUTES.login} replace />;
  if (authError || !role) return <ProfileError message={authError} />;
  return <ResumeRoute uid={user.uid} role={role} brandIds={brandIds} />;
}
