import { lazy, Suspense, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ImageOff } from 'lucide-react';
import type { Post } from '../../types';
import { usePostMedia } from '../../hooks/usePostMedia';
import { useFeedback, useFileDownload } from '../../hooks';

const PostViewer = lazy(() => import('./PostViewer'));

export default function PostMediaCarousel({ post, expandable = true }: { post: Post; expandable?: boolean }) {
  const { media, coverIndex, loading } = usePostMedia(post);
  const feedback = useFeedback();
  const fileDownload = useFileDownload();
  const [index, setIndex] = useState(coverIndex);
  const [viewing, setViewing] = useState(false);
  useEffect(() => setIndex(coverIndex), [coverIndex, post.id]);
  if (loading) return <div className="flex h-full items-center justify-center text-sm text-zinc-400" aria-label="Carregando mídias">Carregando mídia...</div>;
  if (!media.length) return <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-400"><ImageOff className="h-10 w-10" /><span className="text-sm">Sem mídia</span></div>;
  const current = media[Math.min(index, media.length - 1)];
  const safeUrl = current.url && /^https?:\/\//i.test(current.url) ? current.url : undefined;
  return <div className="relative min-h-48 w-full overflow-hidden bg-zinc-100">
    {current.missing || !safeUrl ? <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-500" role="status"><ImageOff className="h-10 w-10" /><span>Mídia indisponível</span></div> : current.mediaType === 'video' ? <video key={current.id} playsInline src={safeUrl} aria-label={current.name} controls preload="metadata" className="mx-auto block max-h-[65vh] h-auto w-full object-contain" /> : <button type="button" disabled={!expandable} className="block w-full" aria-label={expandable ? "Ampliar publicação" : current.name} onClick={() => setViewing(true)}><img src={safeUrl} alt={current.name} loading="lazy" referrerPolicy="no-referrer" className="mx-auto block max-h-[65vh] h-auto w-full object-contain" /></button>}
    {media.length > 1 && <><button type="button" onClick={() => setIndex(value => (value - 1 + media.length) % media.length)} aria-label="Mídia anterior" className="absolute left-3 top-1/2 min-h-11 min-w-11 -translate-y-1/2 rounded-full bg-black/70 p-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><ChevronLeft className="h-5 w-5" /></button><button type="button" onClick={() => setIndex(value => (value + 1) % media.length)} aria-label="Próxima mídia" className="absolute right-3 top-1/2 min-h-11 min-w-11 -translate-y-1/2 rounded-full bg-black/70 p-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><ChevronRight className="h-5 w-5" /></button></>}
    <div className="flex items-center justify-between gap-3 p-3">{expandable && <button type="button" onClick={() => setViewing(true)} className="min-h-11 rounded-xl bg-black/80 px-3 text-xs font-bold text-white">Ver publicação</button>}{media.length > 1 && <span className="text-xs font-bold" aria-live="polite">{index + 1} / {media.length}</span>}</div>
    {safeUrl && <button type="button" disabled={fileDownload.downloadingId === current.id} onClick={async () => { try { await fileDownload.download(current.id, safeUrl, current.name); feedback.success('Download iniciado.'); } catch { feedback.error('Não foi possível baixar o arquivo.'); } }} aria-label={`Baixar mídia ${current.name}`} className="absolute right-3 top-3 min-h-11 min-w-11 rounded-full bg-black/70 p-3 text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><Download className="h-4 w-4" /></button>}
    {viewing && <Suspense fallback={<p role="status">Abrindo publicação...</p>}><PostViewer post={post} media={media} initialIndex={Math.min(index, media.length - 1)} onClose={() => setViewing(false)} /></Suspense>}
  </div>;
}
