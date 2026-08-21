import { RotateCcw, X } from 'lucide-react';
import type { MediaUploadItem } from '../../media';
import MediaPreview from './MediaPreview';

interface UploadQueueItemProps { item: MediaUploadItem; onCancel: (id: string) => void; onRetry: (id: string) => void; }

const status = {
  queued: { label: 'Na fila', className: 'bg-orange-50 text-orange-700' },
  uploading: { label: 'Enviando', className: 'bg-orange-50 text-orange-700' },
  completed: { label: 'Concluído', className: 'bg-green-50 text-green-700' },
  failed: { label: 'Falhou', className: 'bg-red-50 text-red-700' },
  cancelled: { label: 'Cancelado', className: 'bg-red-50 text-red-700' },
} as const;

const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function UploadQueueItem({ item, onCancel, onRetry }: UploadQueueItemProps) {
  const visual = status[item.state];
  return <li className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5" aria-describedby={item.error ? `media-error-${item.id}` : undefined}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <MediaPreview file={item.file} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0"><p className="truncate font-bold text-zinc-900">{item.file.name}</p><p className="mt-1 text-xs text-zinc-500">{item.file.type || 'Tipo não informado'} · {formatSize(item.file.size)}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${visual.className}`} role="status">{visual.label}</span>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-zinc-500"><span>Progresso</span><span>{item.progress.percentage}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200" role="progressbar" aria-label={`Progresso de ${item.file.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.progress.percentage}>
            <div className={`h-full rounded-full transition-[width] ${item.state === 'failed' || item.state === 'cancelled' ? 'bg-red-600' : item.state === 'completed' ? 'bg-green-600' : 'bg-black'}`} style={{ width: `${item.progress.percentage}%` }} />
          </div>
        </div>
        {item.error && <p id={`media-error-${item.id}`} className="mt-2 text-sm text-red-600" role="alert">{item.error}</p>}
      </div>
      <div className="flex shrink-0 gap-2 sm:flex-col">
        {item.state === 'uploading' && <button type="button" onClick={() => onCancel(item.id)} className="min-h-11 rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"><X className="mr-1 inline h-4 w-4" />Cancelar</button>}
        {(item.state === 'failed' || item.state === 'cancelled') && <button type="button" onClick={() => onRetry(item.id)} className="min-h-11 rounded-xl bg-black px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"><RotateCcw className="mr-1 inline h-4 w-4" />Tentar novamente</button>}
      </div>
    </div>
  </li>;
}
