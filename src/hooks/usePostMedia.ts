import { useEffect, useMemo, useState } from 'react';
import type { Post } from '../types';
import type { MediaType } from '../media';
import { loadMediaByIds } from '../services/media.service';

export interface PostDisplayMedia { id: string; url?: string; mediaType?: MediaType; name: string; missing: boolean; legacy: boolean; }

export function usePostMedia(post: Post) {
  const [resolved, setResolved] = useState<PostDisplayMedia[]>([]);
  const [loading, setLoading] = useState(Boolean(post.mediaIds?.length));
  const [error, setError] = useState<string | null>(null);
  const idsKey = post.mediaIds?.join('|') ?? '';

  useEffect(() => {
    let active = true;
    if (!post.mediaIds?.length) { setResolved([]); setLoading(false); setError(null); return; }
    setLoading(true); setError(null);
    loadMediaByIds(post.mediaIds).then(assets => {
      if (!active) return;
      const byId = new Map(assets.map(asset => [asset.id, asset]));
      setResolved(post.mediaIds!.map(id => { const asset = byId.get(id); return asset ? { id, url: asset.downloadUrl, mediaType: asset.mediaType, name: asset.originalFileName, missing: false, legacy: false } : { id, name: 'Mídia indisponível', missing: true, legacy: false }; }));
      setLoading(false);
    }).catch(() => { if (active) { setError('Não foi possível carregar uma ou mais mídias.'); setResolved(post.mediaIds!.map(id => ({ id, name: 'Mídia indisponível', missing: true, legacy: false }))); setLoading(false); } });
    return () => { active = false; };
  }, [idsKey, post.mediaIds]);

  const legacy = useMemo<PostDisplayMedia[]>(() => {
    if (post.mediaIds?.length) return [];
    const urls = post.mediaUrls?.length ? post.mediaUrls : post.mediaUrl ? [post.mediaUrl] : [];
    return [...new Set(urls)].map((url, index) => ({ id: `legacy-${index}`, url, mediaType: post.type === 'reels' ? 'video' : 'image', name: `Mídia do post ${index + 1}`, missing: false, legacy: true }));
  }, [post.mediaIds?.length, post.mediaUrl, post.mediaUrls, post.type]);
  const media = post.mediaIds?.length ? resolved : legacy;
  const coverIndex = post.coverMediaId ? Math.max(0, media.findIndex(item => item.id === post.coverMediaId)) : 0;
  return { media, cover: media[coverIndex], coverIndex, loading, error };
}
