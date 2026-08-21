import { useAuth } from '../contexts/AuthContext';
import FeedView from './FeedView';

export default function ClientDashboard() {
  const { brandId } = useAuth();
  if (!brandId) return <div>Erro: Cliente não identificado.</div>;
  return <FeedView selectedBrandId={brandId} isAdmin={false} />;
}
