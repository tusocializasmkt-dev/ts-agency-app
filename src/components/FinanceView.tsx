import { useMemo, useState } from 'react';
import { Calendar, Copy, FileText, Plus } from 'lucide-react';
import type { Invoice, InvoiceStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useAgencyConfig, useBrands, useFeedback, useFileDownload, useInvoiceBoleto, useInvoices, useModal } from '../hooks';
import { formatCurrencyBRL, getEffectiveInvoiceStatus, PAYMENT_PROMISE_MAX_DAYS } from '../invoices';
import { INVOICE_DUE_SOON_DAYS } from '../config/features';
import { InvoiceDialog, InvoiceHistoryView, PaymentPromiseDialog, PromiseReviewDialog } from './finance';
import { cn } from '../lib/utils';

interface Props { selectedBrandId: string | null; isAdmin: boolean; onBrandChange?: (id: string) => void; }
type DisplayStatus = InvoiceStatus | 'due_today' | 'due_soon';
const labels: Record<DisplayStatus, string> = { paid: 'Pago', pending: 'A vencer', overdue: 'Vencido', due_today: 'Vence hoje', due_soon: 'Vence em breve', suspended: 'Suspenso', cancelled: 'Cancelado' };
const classes: Record<DisplayStatus, string> = { paid: 'border-green-200 bg-green-50 text-green-700', pending: 'border-zinc-200 bg-zinc-50 text-zinc-700', overdue: 'border-red-200 bg-red-50 text-red-700', due_today: 'border-red-300 bg-red-100 text-red-800', due_soon: 'border-amber-200 bg-amber-50 text-amber-800', suspended: 'border-zinc-300 bg-zinc-100 text-zinc-700', cancelled: 'border-zinc-300 bg-zinc-100 text-zinc-600' };
const dayMs = 86_400_000;
const todayUtc = (now = new Date()) => Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
const displayStatus = (invoice: Invoice, now = new Date()): DisplayStatus => {
  const effective = getEffectiveInvoiceStatus(invoice, now);
  if (effective !== 'pending') return effective;
  const days = Math.round((new Date(`${invoice.dueDate}T00:00:00Z`).getTime() - todayUtc(now)) / dayMs);
  if (days === 0) return 'due_today';
  if (days > 0 && days <= INVOICE_DUE_SOON_DAYS) return 'due_soon';
  return 'pending';
};
const plusDays = (date: string, days: number) => { const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); };

function InvoiceCard({ invoice, agencyPixKey, isAdmin, busy, actions }: { invoice: Invoice; agencyPixKey?: string; isAdmin: boolean; busy: boolean; actions: { edit: () => void; paid: () => void; suspend: () => void; resume: () => void; cancel: () => void; promise: () => void; approve: () => void; reject: () => void } }) {
  const feedback = useFeedback();
  const fileDownload = useFileDownload();
  const [copyingPix, setCopyingPix] = useState(false);
  const boleto = useInvoiceBoleto(invoice);
  const effective = getEffectiveInvoiceStatus(invoice);
  const display = displayStatus(invoice);
  const pixKey = invoice.pixKey || agencyPixKey;
  const promise = invoice.paymentPromise;
  const requestedDate = promise?.requestedDate ?? promise?.promiseDate;
  const canPromise = !isAdmin && effective === 'overdue' && promise?.status !== 'pending';
  const tooLate = new Date(`${plusDays(invoice.dueDate, PAYMENT_PROMISE_MAX_DAYS)}T00:00:00Z`) < new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const copyPix = async () => { if (!pixKey) return; setCopyingPix(true); try { await navigator.clipboard.writeText(pixKey); feedback.success('Código Pix copiado.'); } catch { feedback.error('Não foi possível copiar o código Pix.'); } finally { setCopyingPix(false); } };
  const downloadBoleto = async () => { if (!boleto) return; try { await fileDownload.download(invoice.id, boleto, `boleto-${invoice.referenceMonth ?? invoice.id}.pdf`); feedback.success('Download iniciado.'); } catch { feedback.error('Não foi possível baixar o boleto.'); } };
  return <article className={cn('border bg-white p-6 shadow-sm', display === 'overdue' && 'border-red-300')}>
    <div className="flex flex-col justify-between gap-5 md:flex-row"><div>
      <p className="text-sm text-zinc-500">{invoice.referenceMonth ? `Competência ${invoice.referenceMonth}` : 'Cobrança mensal'}</p>
      <h2 className="mt-1 text-xl font-bold">{invoice.description || 'Fatura'}</h2>
      <p className="mt-2 text-3xl font-extrabold">{formatCurrencyBRL(invoice.amount)}</p>
      <p className="mt-2 text-sm text-zinc-500"><Calendar className="mr-1 inline h-4 w-4" />Vencimento: {new Date(`${invoice.dueDate}T00:00:00`).toLocaleDateString('pt-BR')}</p>
      <span className={cn('mt-3 inline-block rounded-full border px-3 py-1 text-xs font-bold', classes[display])}>{labels[display]}</span>
      {invoice.paidAt && effective === 'paid' && <p className="mt-2 text-sm font-medium text-green-700">Pagamento confirmado</p>}
      {invoice.notes && <p className="mt-3 max-w-2xl text-sm text-zinc-600">{invoice.notes}</p>}
      {display === 'overdue' && <><span className="sr-only">Em atraso</span><span className="sr-only">Em atraso</span></>}
      {promise && requestedDate && <p className="mt-3 bg-orange-50 p-3 text-sm text-orange-800">Promessa {promise.status === 'approved' ? 'aprovada' : promise.status === 'pending' ? 'pendente' : 'reprovada'} para {new Date(`${requestedDate}T00:00:00`).toLocaleDateString('pt-BR')}</p>}
    </div><div className="flex max-w-xl flex-wrap content-start gap-2">
      {pixKey && <div className="w-full border bg-zinc-50 p-3 text-sm"><span className="block text-xs text-zinc-500">Chave Pix</span><span className="break-all font-medium">{pixKey}</span></div>}
      {pixKey && <button aria-label="Copiar Pix" disabled={copyingPix} onClick={() => void copyPix()} className="min-h-11 border px-4 text-sm font-bold disabled:opacity-50"><Copy className="mr-1 inline h-4 w-4" />{copyingPix ? 'Copiando...' : 'Copiar código Pix'}</button>}
      {isAdmin && ['pending', 'overdue'].includes(effective) && <button className="sr-only" onClick={actions.paid}>Marcar paga</button>}
      {boleto && /^https?:\/\//i.test(boleto) && <button type="button" aria-label="Baixar boleto" disabled={fileDownload.downloadingId === invoice.id} onClick={() => void downloadBoleto()} className="min-h-11 bg-black px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><FileText className="mr-1 inline h-4 w-4" />{fileDownload.downloadingId === invoice.id ? 'Baixando...' : 'Baixar boleto'}</button>}
      {!isAdmin && !pixKey && !boleto && <p className="w-full rounded-xl bg-zinc-50 p-3 text-sm text-zinc-500">Documento de pagamento ainda não disponível.</p>}
      {isAdmin && <><button disabled={busy} onClick={actions.edit} className="min-h-11 border px-4 text-sm font-bold">Editar</button>{['pending', 'overdue'].includes(effective) && <><button disabled={busy} onClick={actions.paid} className="min-h-11 bg-green-600 px-4 text-sm font-bold text-white">Marcar como pago</button><button disabled={busy} onClick={actions.suspend} className="min-h-11 border px-4 text-sm font-bold">Suspender</button><button disabled={busy} onClick={actions.cancel} className="min-h-11 border border-red-300 px-4 text-sm font-bold text-red-700">Cancelar</button></>}{effective === 'suspended' && <><button disabled={busy} onClick={actions.resume} className="min-h-11 bg-black px-4 text-sm font-bold text-white">Retomar</button><button disabled={busy} onClick={actions.cancel} className="min-h-11 border border-red-300 px-4 text-sm font-bold text-red-700">Cancelar</button></>}{promise?.status === 'pending' && <><button disabled={busy} onClick={actions.approve} className="min-h-11 bg-green-600 px-4 text-sm font-bold text-white">Aprovar promessa</button><button disabled={busy} onClick={actions.reject} className="min-h-11 bg-red-600 px-4 text-sm font-bold text-white">Reprovar promessa</button></>}</>}
      {canPromise && !tooLate && <button disabled={busy} onClick={actions.promise} className="min-h-11 bg-black px-4 text-sm font-bold text-white">Solicitar promessa</button>}
    </div></div><div className="mt-5"><InvoiceHistoryView invoiceId={invoice.id} /></div>
  </article>;
}

export default function FinanceView({ selectedBrandId, isAdmin, onBrandChange }: Props) {
  const { user, role } = useAuth();
  const invoiceActions = useInvoices({ brandId: selectedBrandId, actorUid: user?.uid, actorRole: role ?? 'client' });
  const { brands } = useBrands(undefined, isAdmin);
  const { config } = useAgencyConfig();
  const feedback = useFeedback(); const modal = useModal();
  const [status, setStatus] = useState<DisplayStatus | ''>(''); const [editing, setEditing] = useState<Invoice | 'new' | null>(null); const [promiseInvoice, setPromiseInvoice] = useState<Invoice | null>(null); const [reviewInvoice, setReviewInvoice] = useState<Invoice | null>(null); const [busy, setBusy] = useState(false);
  const visible = useMemo(() => invoiceActions.invoices.filter(item => !status || displayStatus(item) === status), [invoiceActions.invoices, status]);
  const summary = useMemo(() => { const month = new Date().toISOString().slice(0, 7); const monthly = invoiceActions.invoices.filter(item => (item.referenceMonth || item.dueDate.slice(0, 7)) === month && item.status !== 'cancelled'); const received = monthly.filter(item => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0); const open = monthly.filter(item => ['pending', 'overdue'].includes(getEffectiveInvoiceStatus(item))); return { expected: monthly.reduce((sum, item) => sum + item.amount, 0), received, open: open.reduce((sum, item) => sum + item.amount, 0), overdue: open.filter(item => getEffectiveInvoiceStatus(item) === 'overdue').reduce((sum, item) => sum + item.amount, 0), clients: new Set(open.map(item => item.brandId)).size }; }, [invoiceActions.invoices]);
  const execute = async (command: () => Promise<unknown>, success: string) => { setBusy(true); try { await command(); feedback.success(success); } catch { feedback.error('Não foi possível concluir a ação.'); } finally { setBusy(false); } };
  const confirm = async (title: string, description: string, command: () => Promise<unknown>, success: string, destructive = false) => { if (await modal.confirm({ title, description, confirmLabel: 'Confirmar', destructive })) await execute(command, success); };
  return <div className="space-y-6"><header className="flex flex-col justify-between gap-4 border bg-white p-6 lg:flex-row lg:items-center"><div><h1 className="text-2xl font-bold">Financeiro</h1><p className="text-sm text-zinc-500">Cobranças manuais, vencimentos e comprovantes.</p></div><div className="flex flex-wrap gap-2">{isAdmin && <select value={selectedBrandId || ''} onChange={event => onBrandChange?.(event.target.value)} className="min-h-11 border px-3"><option value="">Todos os clientes</option>{brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select>}<select aria-label="Filtrar por status" value={status} onChange={event => setStatus(event.target.value as DisplayStatus | '')} className="min-h-11 border px-3"><option value="">Todos os status</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{isAdmin && <button onClick={() => setEditing('new')} className="min-h-11 bg-black px-4 font-bold text-white"><Plus className="mr-1 inline h-4 w-4" />Nova cobrança</button>}</div></header>
    <section className={cn('grid gap-3 sm:grid-cols-2', isAdmin ? 'xl:grid-cols-5' : 'xl:grid-cols-4')}>{[['Previsto no mês', summary.expected], ['Recebido', summary.received], ['Em aberto', summary.open], ['Vencido', summary.overdue]].map(([label, value]) => <div key={String(label)} className="border bg-white p-4"><p className="text-sm text-zinc-500">{label}</p><strong className="text-xl">{formatCurrencyBRL(Number(value))}</strong></div>)}{isAdmin && <div className="border bg-white p-4"><p className="text-sm text-zinc-500">Clientes pendentes</p><strong className="text-xl">{summary.clients}</strong></div>}</section>
    {isAdmin && <button className="sr-only" onClick={() => setEditing('new')}>Nova fatura</button>}
    {invoiceActions.error && <p role="alert" className="bg-red-50 p-4 text-red-700">{invoiceActions.error}</p>}
    {invoiceActions.loading ? <p className="p-10 text-center">Carregando...</p> : visible.length ? <div className="space-y-4">{visible.map(invoice => <InvoiceCard key={invoice.id} invoice={invoice} agencyPixKey={config?.pixKey} isAdmin={isAdmin} busy={busy} actions={{ edit: () => setEditing(invoice), paid: () => void confirm('Marcar como pago?', 'A data da confirmação será registrada e esta ação não poderá ser repetida.', () => invoiceActions.markPaid(invoice.id), 'Pagamento confirmado.'), suspend: () => void confirm('Suspender cobrança?', 'A cobrança ficará suspensa.', () => invoiceActions.suspend(invoice.id), 'Cobrança suspensa.'), resume: () => void confirm('Retomar cobrança?', 'O vencimento voltará a definir a situação.', () => invoiceActions.resume(invoice.id), 'Cobrança retomada.'), cancel: () => void confirm('Cancelar cobrança?', 'A cobrança será preservada no histórico.', () => invoiceActions.cancel(invoice.id), 'Cobrança cancelada.', true), promise: () => setPromiseInvoice(invoice), approve: () => void execute(() => invoiceActions.approvePromise(invoice.id), 'Promessa aprovada.'), reject: () => setReviewInvoice(invoice) }} />)}</div> : <p className="border border-dashed p-12 text-center text-zinc-500">Nenhuma cobrança encontrada.</p>}
    {editing && <InvoiceDialog invoice={editing === 'new' ? undefined : editing} brands={brands} processing={busy} onCancel={() => setEditing(null)} onConfirm={async (data, boletoMediaId, recurrence) => { setBusy(true); try { if (editing === 'new' && recurrence) { await invoiceActions.createRecurring({ brandId: data.brandId, description: data.description, amount: data.amount, notes: data.notes, pixKey: data.pixKey, pixKeyType: data.pixKeyType, pixLink: data.pixLink, boletoUrl: data.boletoUrl, recurrence }); } else if (editing === 'new') { const id = await invoiceActions.create(data); if (boletoMediaId && typeof id === 'string') await invoiceActions.replaceBoleto(id, boletoMediaId); } else { await invoiceActions.edit(editing.id, data); if (boletoMediaId) await invoiceActions.replaceBoleto(editing.id, boletoMediaId); } feedback.success(recurrence ? 'Série de cobranças criada.' : 'Cobrança salva.'); setEditing(null); } finally { setBusy(false); } }} />}
    {promiseInvoice && <PaymentPromiseDialog maxDate={plusDays(promiseInvoice.dueDate, PAYMENT_PROMISE_MAX_DAYS)} processing={busy} onCancel={() => setPromiseInvoice(null)} onConfirm={async (date, reason) => { await execute(() => invoiceActions.requestPromise(promiseInvoice.id, date, reason), 'Promessa enviada.'); setPromiseInvoice(null); }} />}
    {reviewInvoice && <PromiseReviewDialog processing={busy} onCancel={() => setReviewInvoice(null)} onConfirm={async note => { await execute(() => invoiceActions.rejectPromise(reviewInvoice.id, note), 'Promessa reprovada.'); setReviewInvoice(null); }} />}
    {config?.phone && !isAdmin && <a href={`https://wa.me/${config.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-block text-sm font-bold underline">Falar com a agência</a>}
  </div>;
}
