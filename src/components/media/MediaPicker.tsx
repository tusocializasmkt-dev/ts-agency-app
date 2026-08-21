import { useEffect, useState } from 'react';
import { Check, ImageOff, X } from 'lucide-react';
import { MAX_MEDIA_PER_POST } from '../../media';
import { useMediaLibrary } from '../../hooks/useMediaLibrary';

interface MediaPickerProps { brandId: string; selectedIds: string[]; onConfirm: (ids: string[]) => void; onCancel: () => void; }

export default function MediaPicker({ brandId, selectedIds, onConfirm, onCancel }: MediaPickerProps) {
  const library = useMediaLibrary(brandId);
  const [selection, setSelection] = useState(() => new Set(selectedIds));
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => library.setFilters({ brandId, status: 'ready', order: 'newest' }), [brandId, library.setFilters]);
  const toggle = (id: string) => setSelection(current => { const next = new Set(current); if (next.has(id)) { next.delete(id); setMessage(null); } else if (next.size >= MAX_MEDIA_PER_POST) setMessage(`Selecione no máximo ${MAX_MEDIA_PER_POST} mídias.`); else { next.add(id); setMessage(null); } return next; });

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="media-picker-title">
    <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-zinc-200 p-5"><div><h2 id="media-picker-title" className="text-xl font-bold">Selecionar mídias</h2><p className="mt-1 text-sm text-zinc-500">{selection.size} de {MAX_MEDIA_PER_POST} selecionadas</p></div><button type="button" onClick={onCancel} aria-label="Cancelar seleção de mídias" className="rounded-xl p-3 hover:bg-zinc-100"><X className="h-5 w-5" /></button></header>
      <div className="flex-1 overflow-y-auto p-5">{library.loading ? <p className="py-16 text-center text-zinc-500">Carregando mídias...</p> : library.error ? <div className="py-16 text-center"><p className="text-red-600">{library.error}</p><button type="button" onClick={library.refresh} className="mt-4 rounded-xl bg-black px-4 py-3 text-sm font-bold text-white">Tentar novamente</button></div> : library.media.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{library.media.map(asset => { const selected = selection.has(asset.id); const url = asset.downloadUrl && /^https?:\/\//i.test(asset.downloadUrl) ? asset.downloadUrl : undefined; return <button type="button" key={asset.id} aria-pressed={selected} onClick={() => toggle(asset.id)} className={`relative overflow-hidden rounded-2xl border-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${selected ? 'border-black' : 'border-zinc-200'}`}><div className="aspect-square bg-zinc-100">{asset.mediaType === 'image' && url ? <img src={url} alt={asset.originalFileName} loading="lazy" className="h-full w-full object-cover" /> : asset.mediaType === 'video' && url ? <video src={url} aria-label={asset.originalFileName} preload="metadata" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center"><ImageOff className="h-8 w-8 text-zinc-400" /></span>}</div><span className="block truncate p-3 text-sm font-bold">{asset.originalFileName}</span>{selected && <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black px-2 py-1 text-xs font-bold text-white"><Check className="h-3 w-3" />Selecionada</span>}</button>; })}</div> : <p className="py-16 text-center text-zinc-500">Nenhuma mídia pronta para este cliente.</p>}
        {message && <p className="mt-4 text-sm font-bold text-red-600" role="alert">{message}</p>}
      </div>
      <footer className="flex justify-end gap-3 border-t border-zinc-200 p-5"><button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-zinc-300 px-5 text-sm font-bold">Cancelar</button><button type="button" onClick={() => onConfirm([...selection])} className="min-h-11 rounded-xl bg-black px-5 text-sm font-bold text-white">Confirmar seleção ({selection.size})</button></footer>
    </div>
  </div>;
}
