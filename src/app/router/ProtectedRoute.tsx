import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../lib/firebase';
import { ROUTES } from './routes';

export const AuthLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-black text-white">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white" />
  </div>
);

export const ProfileError = ({ message }: { message?: string | null }) => (
  <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD] p-4">
    <div className="w-full max-w-md bg-white border border-zinc-200 p-10 rounded-3xl shadow-sm text-center">
      <h1 className="text-2xl font-bold tracking-tight mb-3">Acesso não configurado</h1>
      <p className="text-zinc-500 text-sm mb-8">{message || 'Não foi possível identificar seu perfil de acesso.'}</p>
      <button onClick={() => signOut(auth)} className="w-full bg-black text-white font-bold py-4 rounded-2xl hover:bg-zinc-800 transition-all">Voltar ao login</button>
    </div>
  </div>
);

export default function ProtectedRoute() {
  const { user, role, loading, authError } = useAuth();
  const location = useLocation();
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />;
  if (authError || !role) return <ProfileError message={authError} />;
  return <Outlet />;
}
