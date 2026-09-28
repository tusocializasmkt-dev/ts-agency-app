import { useEffect, useState } from 'react';
import type { Invoice } from '../../types';
import { useInvoiceManagement } from '../../hooks/useInvoiceManagement';
import type { InvoiceManagementResult } from '../../services/invoice-management.service';
import GlobalModal from '../ui/GlobalModal';
import InvoiceDeletionDialog from './InvoiceDeletionDialog';
import { formatCurrencyBRL } from '../../invoices';

export default function InvoiceManagementDialog({ invoice, mode, onClose, onComplete, onEditSingle }: { invoice: Invoice; mode: 'delete' | 'series'; onClose: () => void; onComplete: (message: string) => void; onEditSingle: () => void }) {
  const management = useInvoiceManagement();
  const [summary, setSummary] = useState<InvoiceManagementResult['summary']>();
  const [action, setAction] = useState(mode === 'delete' ? 'delete' : 'edit_series');
  const [amount, setAmount] = useState(String(invoice.amount)); const [description, setDescription] = useState(invoice.description || ''); const [notes, setNotes] = useState(invoice.notes || '');
  const [day, setDay] = useState(''); const [endDate, setEndDate] = useState('');
  const [preview, setPreview] = useState<InvoiceManagementResult>(); const [accepted, setAccepted] = useState(false);
  useEffect(() => { if (mode === 'series' && invoice.recurrenceGroupId) void management.inspect(invoice.id).then(result => { if (result) setSummary(result.summary); }); }, [invoice.id, mode]);
  const previewChanges = async () => {
    const command: Record<string, unknown> = { action, invoiceId: invoice.id };
    if (action === 'edit_series') { command.changes = { ...(Number(amount.replace(',', '.')) !== invoice.amount ? { amount: Number(amount.replace(',', '.')) } : {}), ...(description !== (invoice.description || '') ? { description } : {}), ...(notes !== (invoice.notes || '') ? { notes } : {}) }; if (day) command.day = Number(day); if (endDate) command.endDate = endDate; }
    const result = await management.preview(command); if (result) { setPreview(result); setAccepted(false); }
  };
  const confirm = async () => {
    if (!preview?.previewId || !accepted) return;
    const result = await management.confirm(preview.previewId);
    if (result) onComplete(`${result.updated || 0} faturas alteradas; ${result.removed || 0} excluídas; ${result.preserved || 0} preservadas.`);
    else { setPreview(undefined); setAccepted(false); }
  };
  if (action !== 'edit_series') return <InvoiceDeletionDialog invoice={invoice} initialAction={action} onClose={onClose} onComplete={onComplete} onBack={mode === 'series' ? () => setAction('edit_series') : undefined} />;
  return <GlobalModal title="Gerenciar recorrência" size="lg" onClose={onClose} closeOnEscape={!management.busy} closeOnOverlay={!management.busy}>
    <div className="space-y-4">
      {summary && <div className="rounded-xl bg-zinc-50 p-4 text-sm"><strong>{summary.description} · {formatCurrencyBRL(summary.amount)}</strong><p>Primeira parcela: {summary.first} · Última: {summary.last}</p><p>{summary.total} parcelas · {summary.paid} pagas · {summary.open} em aberto · {summary.future} futuras</p></div>}
      {!preview ? <fieldset disabled={management.busy} className="space-y-4">
        {invoice.recurrenceGroupId && mode === 'series' && <button disabled={management.busy} onClick={onEditSingle} className="min-h-11 rounded-xl border px-4">Editar somente esta fatura</button>}
        <label className="block text-sm font-bold">Operação<select aria-label="Operação da recorrência" value={action} disabled={management.busy} onChange={e => setAction(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border p-3">{mode === 'series' && <option value="edit_series">Editar esta e as próximas</option>}<option value="delete">Excluir somente esta</option>{invoice.recurrenceGroupId && <><option value="delete_series">Excluir esta e as próximas</option><option value="delete_before">Excluir faturas anteriores a uma data</option><option value="delete_all">Excluir toda a recorrência</option></>}</select></label>
        {action === 'edit_series' && <div className="grid gap-3 sm:grid-cols-2">
          <label>Valor<input aria-label="Valor da série" value={amount} onChange={e => setAmount(e.target.value)} className="input" /></label>
          <label>Descrição<input aria-label="Descrição da série" value={description} onChange={e => setDescription(e.target.value)} className="input" /></label>
          <label>Dia do vencimento (opcional)<input aria-label="Novo dia do vencimento" type="number" min="1" max="31" value={day} onChange={e => setDay(e.target.value)} className="input" /></label>
          <label>Encurtar até (opcional)<input aria-label="Novo término da recorrência" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" /></label>
          <label className="sm:col-span-2">Observação<textarea aria-label="Observação da série" value={notes} onChange={e => setNotes(e.target.value)} className="w-full rounded-xl border p-3" /></label>
        </div>}
        <p className="text-sm text-zinc-600">Somente campos alterados serão aplicados. Faturas com pagamentos, checkout ou histórico financeiro serão preservadas. A prévia não altera as faturas.</p>
        <button disabled={management.busy} onClick={() => void previewChanges()} className="min-h-11 rounded-xl bg-black px-4 text-white">{management.busy ? 'Consultando...' : 'Gerar prévia'}</button>
      </fieldset> : <div className="space-y-3 rounded-xl border p-4" aria-label="Prévia da operação">
        <p>{preview.updated} faturas serão alteradas. {preview.removed} faturas serão excluídas.</p><p>{preview.preserved} faturas serão preservadas; {preview.protected} possuem proteção.</p>
        {preview.protectedInvoices?.map(item => <p className="text-sm text-amber-800" key={item.id}>{item.dueDate}: {item.reason}</p>)}
        <label className="block"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} /> Conferi a prévia e confirmo esta operação.</label>
        <button disabled={management.busy} onClick={() => setPreview(undefined)} className="min-h-11 rounded-xl border px-4">Voltar</button>
        <button disabled={management.busy || !accepted || !(preview.updated || preview.removed)} onClick={() => void confirm()} className="ml-2 min-h-11 rounded-xl bg-red-700 px-4 text-white">{management.busy ? 'Confirmando...' : `Confirmar: alterar ${preview.updated}, remover ${preview.removed}`}</button>
      </div>}
      {management.error && <p role="alert" className="text-red-700">{management.error}</p>}
      <button disabled={management.busy} onClick={onClose} className="min-h-11 rounded-xl border px-4">Cancelar</button>
    </div>
  </GlobalModal>;
}
