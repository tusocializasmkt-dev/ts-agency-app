import { useEffect, useState } from 'react';
import type { Post } from '../../types';
import { loadPost } from '../../services/posts.service';
import { postStatusLabels, postTypeLabels } from '../../posts/post-labels';
import GlobalModal from '../ui/GlobalModal';
import { PostMediaCarousel } from '../media';
import CopyCaptionButton from './CopyCaptionButton';
import PostDecisionHistory from './PostDecisionHistory';

export default function LinkedPostDialog({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [result, setResult] = useState<{ id: string; post: Post | null } | null>(null);
  useEffect(() => {
    let active = true;
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(postId)) { setResult({ id: postId, post: null }); return; }
    void loadPost(postId).then(post => { if (active) setResult({ id: postId, post }); })
      .catch(() => { if (active) setResult({ id: postId, post: null }); });
    return () => { active = false; };
  }, [postId]);
  const post = result?.id === postId ? result.post : null;
  return <GlobalModal title="Detalhes da publicação" size="lg" onClose={onClose}>
    {result?.id !== postId ? <p role="status">Carregando publicação...</p> : !post ? <p role="alert">Esta publicação não está disponível ou você não tem permissão para visualizá-la.</p> : <div className="space-y-5">
      <div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-lg border px-3 py-2">{postStatusLabels[post.status]}</span>{post.published && <span className="rounded-lg bg-zinc-900 px-3 py-2 text-white">POSTADO</span>}</div>
      {post.title && <h3 className="break-words text-lg font-bold">{post.title}</h3>}
      <PostMediaCarousel post={post} expandable={false} />
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{post.caption}</p>
      <CopyCaptionButton caption={post.caption} />
      <p className="text-sm text-zinc-600">{new Date(post.scheduledDate).toLocaleString('pt-BR')} · {post.socialNetwork} · {postTypeLabels[post.type]}</p>
      <PostDecisionHistory postId={post.id} />
    </div>}
  </GlobalModal>;
}
