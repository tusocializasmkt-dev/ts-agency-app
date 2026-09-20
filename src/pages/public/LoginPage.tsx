import ResumeRoute from '../../app/router/ResumeRoute';
import { useLocation } from 'react-router-dom';
import LoginForm from '../../components/LoginPage';
import { useAuth } from '../../contexts/AuthContext';
import { AuthLoading, ProfileError } from '../../app/router/ProtectedRoute';
export default function LoginPage() {
  const { user, role, loading, authError, brandIds } = useAuth();
  const location = useLocation();
  if (loading) return <AuthLoading />;
  if (!user) return <LoginForm />;
  if (authError || !role) return <ProfileError message={authError} />;
  const requested = (location.state as { from?: string } | null)?.from;
  return <ResumeRoute uid={user.uid} role={role} brandIds={brandIds} requested={requested} />;
}
