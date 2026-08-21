import { useState } from 'react';
import GlobalModal from '../ui/GlobalModal';
import { POST_FEEDBACK_MAX_LENGTH, POST_FEEDBACK_MIN_LENGTH } from '../../posts';

interface PostDecisionDialogProps { mode: 'rejection' | 'changes'; processing?: boolean; onCancel: () => void; onConfirm: (feedback: string) => Promise<void>; }
export default function PostDecisionDialog({ mode, processing = false, onCancel, onConfirm }: PostDecisionDialogProps) {
  const [feedback, setFeedback] = useState(''); const [error, setError] = useState<string | null>(null);
  const submit = async () => { const normalized = feedback.trim(); if (normalized.length < POST_FEEDBACK_MIN_LENGTH) { setError(`Escreva pelo menos ${POST_FEEDBACK_MIN_LENGTH} caracteres.`); return; } if (normalized.length > POST_FEEDBACK_MAX_LENGTH) { setError(`Use no máximo ${POST_FEEDBACK_MAX_LENGTH} caracteres.`); return; } setError(null); try { await onConfirm(normalized); } catch { setError('Não foi possível salvar a decisão. Tente novamente.'); } };
  const rejection = mode === 'rejection';
  return <GlobalModal title={rejection ? 'Reprovar conteúdo' : 'Pedir ajustes'} size="md" onClose={onCancel} closeOnOverlay={!processing} closeOnEscape={!processing}>
    <p className="text-sm leading-relaxed text-zinc-500">{rejection ? 'Explique claramente por que o conteúdo não pode ser aprovado.' : 'Descreva o que precisa ser alterado antes de uma nova avaliação.'}</p>
    <label htmlFor="decision-feedback" className="mt-5 block text-sm font-bold">Feedback obrigatório</label><textarea id="decision-feedback" value={feedback} disabled={processing} maxLength={POST_FEEDBACK_MAX_LENGTH} onChange={event => { setFeedback(event.target.value); setError(null); }} rows={6} aria-describedby="decision-counter decision-error" className="mt-2 w-full resize-none rounded-xl border border-zinc-300 p-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50" />
    <div className="mt-2 flex justify-between text-xs"><span id="decision-error" className="text-red-600" role={error ? 'alert' : undefined}>{error}</span><span id="decision-counter" className="text-zinc-500">{feedback.length}/{POST_FEEDBACK_MAX_LENGTH}</span></div>
    <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onCancel} disabled={processing} className="min-h-11 rounded-xl border border-zinc-300 px-5 text-sm font-bold disabled:opacity-50">Cancelar</button><button type="button" onClick={() => void submit()} disabled={processing} className={`min-h-11 rounded-xl px-5 text-sm font-bold text-white disabled:opacity-50 ${rejection ? 'bg-red-600' : 'bg-black'}`}>{processing ? 'Salvando...' : rejection ? 'Confirmar reprovação' : 'Enviar pedido'}</button></div>
  </GlobalModal>;
}
