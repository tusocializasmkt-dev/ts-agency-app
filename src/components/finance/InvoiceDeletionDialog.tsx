import { useEffect, useRef, useState } from 'react';
import type { Invoice } from '../../types';
import { useInvoiceManagement } from '../../hooks/useInvoiceManagement';
import { invoiceManagementError, previewInvoiceManagement, type InvoiceManagementResult } from '../../services/invoice-management.service';
import GlobalModal from '../ui/GlobalModal';

type Props = { invoice: Invoice; initialAction?: string; onClose: () => void; onComplete: (message: string) => void; onBack?: () => void };
const feedback = (result: InvoiceManagementResult) => `${result.removed || 0} ${result.removed === 1 ? 'fatura excluída' : 'faturas excluídas'}${result.protected ? `. ${result.protected} ${result.protected === 1 ? 'fatura protegida foi preservada' : 'faturas protegidas foram preservadas'}.` : ' com sucesso.'}`;
const displayDate = (date: string) => date.split('-').reverse().join('/');

function ProtectedInvoices({ result, finished = false }: { result: InvoiceManagementResult; finished?: boolean }) {
  if (!result.protected) return null;
  const external = result.protectedInvoices?.every(item => item.reason.startsWith('Pagamento externo'));
  const singular = result.protected === 1;
  return <div className="text-sm text-amber-800">
    <p>{result.protected} {singular ? `fatura ${finished ? 'foi' : 'será'} preservada` : `faturas ${finished ? 'foram' : 'serão'} preservadas`} {external ? `porque ${singular ? 'possui pagamento externo vinculado' : 'possuem pagamentos externos vinculados'}` : 'por proteção financeira ou limite seguro'}.</p>
    <details className="mt-2"><summary className="cursor-pointer font-medium">Ver faturas protegidas e motivos</summary>
      <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">{result.protectedInvoices?.map(item => <li key={item.id}>{displayDate(item.dueDate)} · Fatura {item.id}: {item.reason}</li>)}</ul>
    </details>
  </div>;
}

export default function InvoiceDeletionDialog({ invoice, initialAction = 'delete', onClose, onComplete, onBack }: Props) {
  const management = useInvoiceManagement();
  const [action, setAction] = useState(initialAction);
  const [before, setBefore] = useState('');
  const [calculation, setCalculation] = useState<{ key: string; result?: InvoiceManagementResult; error?: string }>();
  const [confirming, setConfirming] = useState(false);
  const [finished, setFinished] = useState<InvoiceManagementResult>();
  const [revision, setRevision] = useState(0);
  const submitting = useRef(false);
  const key = JSON.stringify([invoice.id, action, before, revision]);
  const valid = action !== 'delete_before' || /^\d{4}-\d{2}-\d{2}$/.test(before);
  const current = calculation?.key === key ? calculation : undefined;
  const count = current?.result?.removed || 0;

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    // Debounce parameter changes and ignore obsolete responses, without caching eligibility locally.
    const timer = setTimeout(() => {
      void previewInvoiceManagement({ action, invoiceId: invoice.id, ...(action === 'delete_before' ? { before } : {}) })
        .then(result => { if (!cancelled) setCalculation({ key, result }); })
        .catch(error => { if (!cancelled) setCalculation({ key, error: invoiceManagementError(error) }); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [key, valid, action, before, invoice.id]);

  const remove = async () => {
    if (!confirming || !current?.result?.previewId || submitting.current) return;
    submitting.current = true;
    const result = await management.confirm(current.result.previewId);
    if (result) {
      if (result.protected) setFinished(result);
      else onComplete(feedback(result));
    } else setRevision(value => value + 1);
    setConfirming(false);
    submitting.current = false;
  };

  return <GlobalModal title="Excluir faturas" onClose={onClose} size="lg" closeOnEscape={!management.busy} closeOnOverlay={!management.busy} showCloseButton={!management.busy}>
    <div className="space-y-4">
      {finished ? <>
        <p role="status">{feedback(finished)}</p><ProtectedInvoices result={finished} finished />
        <button onClick={() => onComplete(feedback(finished))} className="min-h-11 rounded-xl bg-black px-4 text-white">Concluir</button>
      </> : <>
        <fieldset disabled={management.busy || confirming} className="space-y-4">
          <label className="block font-bold">Operação<select aria-label="Operação de exclusão" value={action} onChange={event => setAction(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border p-3">
            <option value="delete">Excluir somente esta fatura</option>
            {invoice.recurrenceGroupId && <><option value="delete_series">Excluir esta e as próximas</option><option value="delete_before">Excluir faturas anteriores a uma data</option><option value="delete_all">Excluir toda a recorrência</option></>}
          </select></label>
          {action === 'delete_before' && <label className="block">Excluir faturas anteriores a<input aria-label="Excluir faturas anteriores a" type="date" value={before} onChange={event => setBefore(event.target.value)} className="input" /></label>}
        </fieldset>
        {!valid ? <p>Escolha a data limite para calcular.</p> : !current ? <p role="status">Calculando faturas elegíveis...</p> : current.error ? <p role="alert">{current.error}</p> : <>
          <p role="status">{count ? `${count} ${count === 1 ? 'fatura será excluída' : 'faturas serão excluídas'}.` : 'Nenhuma fatura elegível nesta seleção.'}</p>
          <ProtectedInvoices result={current.result!} />
        </>}
        {confirming ? <div className="space-y-3 rounded-xl border p-4">
          <p>Tem certeza que deseja excluir {count === 1 ? 'esta fatura' : `estas ${count} faturas`}? Esta ação não poderá ser desfeita.</p>
          <button disabled={management.busy} onClick={() => setConfirming(false)} className="min-h-11 rounded-xl border px-4">Voltar</button>
          <button disabled={management.busy} onClick={() => void remove()} className="ml-2 min-h-11 rounded-xl bg-red-700 px-4 text-white">{management.busy ? 'Excluindo...' : 'Confirmar exclusão'}</button>
        </div> : <button disabled={!count || management.busy} onClick={() => setConfirming(true)} className="min-h-11 rounded-xl bg-red-700 px-4 text-white disabled:opacity-50">{count === 1 ? 'Excluir fatura' : `Excluir ${count} faturas`}</button>}
        {management.error && <p role="alert" className="text-red-700">{management.error}</p>}
        {current?.error && <button onClick={() => setRevision(value => value + 1)} className="min-h-11 rounded-xl border px-4">Recalcular</button>}
        <div className="flex gap-2"><button disabled={management.busy} onClick={onClose} className="min-h-11 rounded-xl border px-4">Cancelar</button>{onBack && <button disabled={management.busy} onClick={onBack} className="min-h-11 rounded-xl border px-4">Voltar à edição</button>}</div>
      </>}
    </div>
  </GlobalModal>;
}
