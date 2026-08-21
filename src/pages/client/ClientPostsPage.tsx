import FeedView from '../../components/FeedView';
import { useAuth } from '../../contexts/AuthContext';
export default function ClientPostsPage() { const { brandId } = useAuth(); return brandId ? <FeedView selectedBrandId={brandId} isAdmin={false} /> : <div>Cliente não identificado.</div>; }
