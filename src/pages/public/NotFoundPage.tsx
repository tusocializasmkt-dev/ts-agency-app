import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROUTES } from '../../app/router/routes';

export default function NotFoundPage() {
  const { user, role } = useAuth();
  const destination = !user ? ROUTES.login : role === 'admin' ? ROUTES.admin.root : role === 'client' ? ROUTES.client.root : ROUTES.root;
  return <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD] p-4"><div className="w-full max-w-md bg-white border border-zinc-200 p-10 rounded-3xl shadow-sm text-center"><p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-400 mb-4">Erro 404</p><h1 className="text-3xl font-bold tracking-tight mb-3">Página não encontrada</h1><p className="text-zinc-500 text-sm mb-8">O endereço informado não existe ou não está disponível.</p><Link to={destination} replace className="block w-full bg-black text-white font-bold py-4 rounded-2xl hover:bg-zinc-800 transition-all">Voltar para a área inicial</Link></div></div>;
}
