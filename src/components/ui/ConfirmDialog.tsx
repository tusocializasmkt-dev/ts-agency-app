import type { ConfirmDialogOptions } from '../../ui/ui.types';
import GlobalModal from './GlobalModal';

interface ConfirmDialogProps { options: ConfirmDialogOptions; onConfirm: () => void; onCancel: () => void; processing?: boolean; }

export default function ConfirmDialog({ options, onConfirm, onCancel, processing = false }: ConfirmDialogProps) {
  const destructive = options.destructive || options.variant === 'destructive';
  return <GlobalModal title={options.title} size="sm" onClose={onCancel} closeOnOverlay={!processing} closeOnEscape={!processing}>
    {options.description && <p className="text-sm text-zinc-500 leading-relaxed mb-8">{options.description}</p>}
    <div className="flex gap-3 justify-end">
      <button type="button" onClick={onCancel} disabled={processing} autoFocus className="px-5 py-3 rounded-xl border border-zinc-200 font-bold text-sm hover:bg-zinc-50 disabled:opacity-50">{options.cancelLabel || 'Cancelar'}</button>
      <button type="button" onClick={onConfirm} disabled={processing} className={destructive ? 'px-5 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-50' : 'px-5 py-3 rounded-xl bg-black text-white font-bold text-sm hover:bg-zinc-800 disabled:opacity-50'}>{options.confirmLabel || 'Confirmar'}</button>
    </div>
  </GlobalModal>;
}
