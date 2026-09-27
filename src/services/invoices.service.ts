import { callManageInvoices } from '../data/functions/invoice-management.functions';
import type { Invoice, InvoiceHistory, InvoiceStatus, PaymentPromise, UserRole } from '../types';
import * as repository from '../data/repositories';
import { assertInvoiceTransition, buildRecurringDueDates, getEffectiveInvoiceStatus, validateCivilDate, validateInvoiceAmount, validatePaymentPromise, validatePixLink, type InvoiceRecurrence } from '../invoices';
import { notifyInvoiceCreated, notifyPaymentPromiseApproved, notifyPaymentPromiseRejected } from './notifications.service';
import { callConfirmInvoicePayment, callReportInvoicePayment } from '../data/functions/invoice-billing.functions';
import { callRequestPaymentPromise } from '../data/functions';
export const watchInvoices = repository.subscribeToInvoices; export const watchBrandInvoices = repository.subscribeToInvoicesByBrand; export const watchInvoiceHistory = repository.subscribeToInvoiceHistory;
export interface InvoiceActor { actorUid: string; actorRole: UserRole; }
const history = (invoice: Pick<Invoice, 'id' | 'brandId'>, action: InvoiceHistory['action'], actor: InvoiceActor, extra: Partial<InvoiceHistory> = {}): Omit<InvoiceHistory, 'id' | 'createdAt'> => ({ invoiceId: invoice.id, brandId: invoice.brandId, action, actorUid: actor.actorUid, actorRole: actor.actorRole, ...extra });
const requireInvoice = async (id: string) => { const item = await repository.getInvoiceById(id); if (!item) throw new Error('Fatura não encontrada.'); return item; };
export async function createInvoice(data: Pick<Invoice, 'brandId' | 'description' | 'amount' | 'dueDate'> & Partial<Invoice>, actor: InvoiceActor) { if (actor.actorRole !== 'admin' || !actor.actorUid || !data.brandId || !data.description?.trim()) throw new Error('Dados inválidos.'); validateInvoiceAmount(data.amount); validateCivilDate(data.dueDate); validatePixLink(data.boletoUrl); const invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> = { brandId: data.brandId, description: data.description.trim(), notes: data.notes?.trim(), amount: data.amount, currency: 'BRL', referenceMonth: data.referenceMonth, originalDueDate: data.dueDate, dueDate: data.dueDate, status: 'pending', boletoMediaId: data.boletoMediaId, boletoUrl: data.boletoUrl, pixKey: data.pixKey, pixKeyType: data.pixKey ? data.pixKeyType : undefined, createdBy: actor.actorUid }; const id = await repository.createInvoice(invoice, { invoiceId: '', brandId: data.brandId, action: 'created', actorUid: actor.actorUid, actorRole: actor.actorRole, newStatus: 'pending', newAmount: data.amount, newDueDate: data.dueDate }); try { await notifyInvoiceCreated(data.brandId, id); } catch { /* notificação não bloqueia a fatura */ } return id; }
export interface RecurringInvoiceInput extends Pick<Invoice, 'brandId' | 'description' | 'amount'>, Partial<Pick<Invoice, 'notes' | 'pixKey' | 'pixKeyType' | 'pixLink' | 'boletoUrl'>> { recurrence: InvoiceRecurrence; }
export async function createRecurringInvoices(data: RecurringInvoiceInput, actor: InvoiceActor): Promise<string[]> {
  if (actor.actorRole !== 'admin' || !actor.actorUid || !data.brandId || !data.description?.trim()) throw new Error('Dados inválidos.');
  validateInvoiceAmount(data.amount); validatePixLink(data.boletoUrl);
  const dates = buildRecurringDueDates(data.recurrence); const recurrenceGroupId = crypto.randomUUID();
  const entries = dates.map(({ referenceMonth, dueDate }, recurrenceIndex) => {
    const invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> = { brandId: data.brandId, description: data.description.trim(), notes: data.notes?.trim(), amount: data.amount, currency: 'BRL', referenceMonth, originalDueDate: dueDate, dueDate, status: 'pending', boletoUrl: data.boletoUrl, pixKey: data.pixKey, pixKeyType: data.pixKey ? data.pixKeyType : undefined, pixLink: data.pixLink, createdBy: actor.actorUid, recurrenceGroupId, recurrenceIndex, recurrenceTotal: dates.length, recurrenceStart: data.recurrence.start, recurrenceEnd: data.recurrence.end, recurrenceDay: data.recurrence.day };
    return { invoice, history: { invoiceId: '', brandId: data.brandId, action: 'created' as const, actorUid: actor.actorUid, actorRole: actor.actorRole, newStatus: 'pending' as const, newAmount: data.amount, newDueDate: dueDate } };
  });
  const ids = await repository.createInvoiceSeries(entries);
  await Promise.allSettled(ids.map(id => notifyInvoiceCreated(data.brandId, id)));
  return ids;
}
export async function editInvoice(id: string, changes: Partial<Invoice>, actor: InvoiceActor) {
  if (actor.actorRole !== 'admin' || !actor.actorUid) throw new Error('Acesso negado.');
  const allowed = ['description', 'notes', 'amount', 'dueDate', 'referenceMonth', 'pixKey', 'pixKeyType', 'boletoUrl', 'boletoMediaId'];
  const payload = Object.fromEntries(Object.entries(changes).filter(([key]) => allowed.includes(key)).map(([key, value]) => [key, value ?? '']));
  return callManageInvoices({ phase: 'apply', action: 'edit', invoiceId: id, changes: payload });
}
async function transition(id: string, next: InvoiceStatus, _action: InvoiceHistory['action'], actor: InvoiceActor) {
  if (actor.actorRole !== 'admin') throw new Error('Acesso negado.');
  const current = await requireInvoice(id); assertInvoiceTransition(getEffectiveInvoiceStatus(current), next);
  return callManageInvoices({ phase: 'apply', action: 'transition', invoiceId: id, status: next });
}
export async function markPaid(id: string, actor: InvoiceActor) { if (actor.actorRole !== 'admin' || !actor.actorUid) throw new Error('Acesso negado.'); return callConfirmInvoicePayment(id); }
export async function reportPayment(id: string, actor: InvoiceActor) { if (actor.actorRole !== 'client' || !actor.actorUid) throw new Error('Acesso negado.'); return callReportInvoicePayment(id); }
 export const suspendInvoice = (id: string, actor: InvoiceActor) => transition(id, 'suspended', 'suspended', actor); export const resumeInvoice = (id: string, actor: InvoiceActor) => transition(id, 'pending', 'resumed', actor); export const cancelInvoice = (id: string, actor: InvoiceActor) => transition(id, 'cancelled', 'cancelled', actor);
export async function replaceBoleto(id: string, mediaId: string, actor: InvoiceActor) { return editInvoice(id, { boletoMediaId: mediaId }, actor); }
export async function requestPaymentPromise(id: string, requestedDate: string, reason: string, actor: InvoiceActor, now = new Date()) { const current = await requireInvoice(id); if (actor.actorRole !== 'client' || actor.actorUid !== current.brandId) throw new Error('Acesso negado.'); const promise = validatePaymentPromise(current, requestedDate, reason, now); await callRequestPaymentPromise(id, promise.requestedDate!, promise.reason!); }
export async function approvePaymentPromise(id: string, actor: InvoiceActor) { const current = await requireInvoice(id); const promise = current.paymentPromise; if (actor.actorRole !== 'admin' || !promise?.requestedDate || promise.status !== 'pending') throw new Error('Promessa inválida.'); const reviewed: PaymentPromise = { ...promise, status: 'approved', reviewedBy: actor.actorUid }; await repository.reviewPaymentPromise(id, reviewed, promise.requestedDate, history(current, 'payment_promise_approved', actor)); try { await notifyPaymentPromiseApproved(current.brandId, id); } catch {} }
export async function rejectPaymentPromise(id: string, note: string, actor: InvoiceActor) { const current = await requireInvoice(id); const promise = current.paymentPromise; if (actor.actorRole !== 'admin' || !promise || promise.status !== 'pending' || note.trim().length < 3) throw new Error('Promessa inválida.'); const reviewed: PaymentPromise = { ...promise, status: 'rejected', reviewedBy: actor.actorUid, reviewNote: note.trim() }; await repository.reviewPaymentPromise(id, reviewed, undefined, history(current, 'payment_promise_rejected', actor, { note: note.trim() })); try { await notifyPaymentPromiseRejected(current.brandId, id); } catch {} }
