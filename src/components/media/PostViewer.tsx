import { useState } from 'react';
import type { Post } from '../../types';
import type { PostDisplayMedia } from '../../hooks/usePostMedia';
import GlobalModal from '../ui/GlobalModal';

export default function PostViewer({ post, media, initialIndex, onClose }: { post: Post; media: PostDisplayMedia[]; initialIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const current = media[Math.min(index, media.length - 1)];
  const url = current?.url && /^https?:\/\//i.test(current.url) ? current.url : undefined;
  const move = (delta: number) => { setIndex(value => (value + delta + media.length) % media.length); setZoom(1); };
  return <GlobalModal title="Visualizar publicação" size="xl" onClose={onClose}>
    <div className="space-y-4">
      <div className="max-h-[60vh] overflow-auto rounded-xl bg-zinc-100" tabIndex={0} aria-label="Mídia ampliada">
        {!url || current.missing ? <p className="p-8 text-center">Mídia indisponível</p> : current.mediaType === 'video'
          ? <video key={current.id} src={url} controls playsInline preload="metadata" aria-label={current.name} className="mx-auto max-h-[60vh] w-full object-contain" />
          : <div style={{ width: `${zoom * 100}%` }}><img src={url} alt={current.name} className="mx-auto block h-auto object-contain" style={{ width: '100%', maxHeight: `${zoom * 60}vh` }} /></div>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {media.length > 1 && <><button className="min-h-11 rounded-xl border px-4" onClick={() => move(-1)}>Mídia anterior</button><span aria-live="polite">{index + 1} / {media.length}</span><button className="min-h-11 rounded-xl border px-4" onClick={() => move(1)}>Próxima mídia</button></>}
        {url && current.mediaType !== 'video' && <><button className="min-h-11 rounded-xl border px-4" disabled={zoom >= 3} onClick={() => setZoom(value => Math.min(3, value + 0.5))}>Ampliar imagem</button><button className="min-h-11 rounded-xl border px-4" disabled={zoom === 1} onClick={() => setZoom(1)}>Tamanho normal</button><span aria-live="polite">{zoom * 100}%</span></>}
      </div>
      <p className="text-sm text-zinc-500">{post.socialNetwork} · {post.scheduledDate && new Date(post.scheduledDate).toLocaleDateString('pt-BR')}</p>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-700">{post.caption}</p>
    </div>
  </GlobalModal>;
}
