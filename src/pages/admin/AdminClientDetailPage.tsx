import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Link, useParams } from 'react-router-dom';
import BrandDetail from '../../components/Admin/BrandDetail';
import { ROUTES } from '../../app/router/routes';

export default function AdminClientDetailPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const { isTeamMember, brandIds } = useAuth();
  if (isTeamMember && brandId && !brandIds.includes(brandId)) return <Navigate to={ROUTES.admin.root} replace />;
  if (!brandId) return <div className="p-20 text-center text-red-500">Cliente inválido.</div>;
  return <div className="space-y-6"><Link to={ROUTES.admin.clients} className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black">← Voltar para clientes</Link><BrandDetail brandId={brandId} /></div>;
}
