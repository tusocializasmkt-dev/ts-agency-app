import { Navigate, useSearchParams } from 'react-router-dom';
import FeedView from '../../components/FeedView';
import { useAuth } from '../../contexts/AuthContext';
import { ROUTES } from '../../app/router/routes';
import LinkedPostDialog from '../../components/posts/LinkedPostDialog';
export default function AdminPostsPage() {
  const [params, setParams] = useSearchParams();
  const brandId = params.get('brandId') || null;
  const { isTeamMember, brandIds } = useAuth();
  if (isTeamMember && brandId && !brandIds.includes(brandId)) return <Navigate to={ROUTES.admin.root} replace />;
  return <><FeedView key={brandId ?? 'all'} selectedBrandId={brandId} isAdmin onBrandChange={id => {
    const next = new URLSearchParams(params);
    if (id) next.set('brandId', id); else next.delete('brandId');
    setParams(next);
  }} />{params.get('postId') && <LinkedPostDialog postId={params.get('postId')!} onClose={() => { const next = new URLSearchParams(params); next.delete('postId'); setParams(next, { replace: true }); }} />}</>;
}
