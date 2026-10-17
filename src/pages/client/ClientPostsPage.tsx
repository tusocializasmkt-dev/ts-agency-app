import FeedView from '../../components/FeedView';
import { useAuth } from '../../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import LinkedPostDialog from '../../components/posts/LinkedPostDialog';
export default function ClientPostsPage() {
  const { brandId } = useAuth();
  const [params, setParams] = useSearchParams();
  return brandId ? <><FeedView selectedBrandId={brandId} isAdmin={false} />{params.get('postId') && <LinkedPostDialog postId={params.get('postId')!} onClose={() => { const next = new URLSearchParams(params); next.delete('postId'); setParams(next, { replace: true }); }} />}</> : <div>Cliente não identificado.</div>;
}
