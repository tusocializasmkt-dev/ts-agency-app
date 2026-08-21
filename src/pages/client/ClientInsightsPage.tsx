import InsightsView from '../../components/InsightsView';
import { useAuth } from '../../contexts/AuthContext';
export default function ClientInsightsPage() { const { brandId } = useAuth(); return brandId ? <InsightsView selectedBrandId={brandId} isAdmin={false} /> : <div>Cliente não identificado.</div>; }
