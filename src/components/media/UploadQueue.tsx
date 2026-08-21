import type { MediaUploadItem } from '../../media';
import UploadQueueItem from './UploadQueueItem';

interface UploadQueueProps { items: MediaUploadItem[]; onCancel: (id: string) => void; onRetry: (id: string) => void; }

export default function UploadQueue({ items, onCancel, onRetry }: UploadQueueProps) {
  if (!items.length) return <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-500">Selecione ou arraste arquivos para começar.</div>;
  return <ul className="space-y-3" aria-label="Fila de uploads">{items.map(item => <UploadQueueItem key={item.id} item={item} onCancel={onCancel} onRetry={onRetry} />)}</ul>;
}
