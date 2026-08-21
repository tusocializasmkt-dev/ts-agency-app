import { Eye, File, Image as ImageIcon, RotateCcw, Trash2, Video } from 'lucide-react';
import type { MediaAsset } from '../../media';

interface MediaCardProps { asset: MediaAsset; brandName: string; onView: (asset: MediaAsset) => void; onDelete: (asset: MediaAsset) => void; onRestore: (asset: MediaAsset) => void; }
const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const statusLabels = { pending: 'Processando', ready: 'Pronto', failed: 'Falha', deleted: 'Excluído' } as const;
const statusClasses = { pending: 'bg-orange-50 text-orange-700', ready: 'bg-green-50 text-green-700', failed: 'bg-red-50 text-red-700', deleted: 'bg-zinc-200 text-zinc-700' } as const;

export default function MediaCard({ asset, brandName, onView, onDelete, onRestore }: MediaCardProps) {
  const previewUrl = asset.downloadUrl && /^https?:\/\//i.test(asset.downloadUrl) ? asset.downloadUrl : undefined;
  return <article className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md">
    <button type="button" onClick={() => onView(asset)} aria-label={`Visualizar ${asset.originalFileName}`} className="block aspect-square w-full overflow-hidden bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black">
      {asset.mediaType === 'image' && previewUrl ? <img src={previewUrl} alt={`Preview de ${asset.originalFileName}`} loading="lazy" className="h-full w-full object-cover" /> : asset.mediaType === 'video' && previewUrl ? <video src={previewUrl} aria-label={`Preview de ${asset.originalFileName}`} preload="metadata" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-zinc-400">{asset.mediaType === 'image' ? <ImageIcon aria-hidden="true" className="h-10 w-10" /> : asset.mediaType === 'video' ? <Video aria-hidden="true" className="h-10 w-10" /> : <File aria-hidden="true" className="h-10 w-10" />}</span>}
    </button>
    <div className="p-4">
      <div className="flex items-start justify-between gap-2"><h3 className="min-w-0 truncate font-bold" title={asset.originalFileName}>{asset.originalFileName}</h3><span role="status" className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${statusClasses[asset.status]}`}>{statusLabels[asset.status]}</span></div>
      <p className="mt-1 truncate text-xs text-zinc-500">{brandName} · {asset.mediaType === 'image' ? 'Imagem' : asset.mediaType === 'video' ? 'Vídeo' : 'Documento'}</p>
      <p className="mt-1 text-xs text-zinc-500">{formatSize(asset.sizeBytes)} · {asset.createdAt ? asset.createdAt.toLocaleDateString('pt-BR') : 'Data indisponível'}</p>
      <div className="mt-4 flex gap-2"><button type="button" onClick={() => onView(asset)} className="min-h-10 flex-1 rounded-xl border border-zinc-300 px-3 text-xs font-bold hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"><Eye className="mr-1 inline h-4 w-4" />Visualizar</button>{asset.status === 'deleted' ? <button type="button" onClick={() => onRestore(asset)} className="min-h-10 rounded-xl bg-black px-3 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2" aria-label={`Restaurar ${asset.originalFileName}`}><RotateCcw className="h-4 w-4" /></button> : asset.status === 'ready' ? <button type="button" onClick={() => onDelete(asset)} className="min-h-10 rounded-xl border border-red-200 px-3 text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600" aria-label={`Mover ${asset.originalFileName} para lixeira`}><Trash2 className="h-4 w-4" /></button> : null}</div>
    </div>
  </article>;
}
