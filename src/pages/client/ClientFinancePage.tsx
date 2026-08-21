import FinanceView from '../../components/FinanceView';
import { useAuth } from '../../contexts/AuthContext';

export default function ClientFinancePage() {
  const { brandId } = useAuth();
  if (!brandId) return <div>Cliente não identificado.</div>;
  return <FinanceView selectedBrandId={brandId} isAdmin={false} />;
}
