import { collection, deleteField, doc, getDoc, orderBy, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Invoice, InvoiceHistory, InvoiceStatus, PaymentPromise } from '../../types';
import { normalizeFirestoreError, subscribeToQuery, type DataListener, type ErrorListener } from '../firebase';
import { mapInvoice, mapInvoiceHistory, toInvoiceHistoryWriteData, toInvoiceWriteData } from '../mappers';
const invoices = collection(db, 'invoices');
type HistoryInput = Omit<InvoiceHistory, 'id' | 'createdAt'>;
export const subscribeToInvoices = (onData: DataListener<Invoice[]>, onError: ErrorListener, status?: InvoiceStatus) => subscribeToQuery(status ? query(invoices, where('status', '==', status), orderBy('dueDate', 'desc')) : query(invoices, orderBy('dueDate', 'desc')), mapInvoice, onData, onError, 'invoice', 'subscribe');
export const subscribeToInvoicesByBrand = (brandId: string, onData: DataListener<Invoice[]>, onError: ErrorListener, status?: InvoiceStatus) => subscribeToQuery(status ? query(invoices, where('brandId', '==', brandId), where('status', '==', status), orderBy('dueDate', 'desc')) : query(invoices, where('brandId', '==', brandId), orderBy('dueDate', 'desc')), mapInvoice, onData, onError, 'invoice', 'subscribe-by-brand');
export const subscribeToInvoiceHistory = (invoiceId: string, onData: DataListener<InvoiceHistory[]>, onError: ErrorListener) => subscribeToQuery(query(collection(db, 'invoices', invoiceId, 'history'), orderBy('createdAt', 'desc')), mapInvoiceHistory, onData, onError, 'invoice-history', 'subscribe');
export async function getInvoiceById(id: string): Promise<Invoice | null> { try { const snapshot = await getDoc(doc(db, 'invoices', id)); return snapshot.exists() ? mapInvoice(snapshot) : null; } catch (error) { throw normalizeFirestoreError(error, 'get', 'invoice'); } }
async function commit(invoiceId: string, changes: Partial<Invoice> & Record<string, unknown>, history: HistoryInput) { try { const batch = writeBatch(db); batch.update(doc(db, 'invoices', invoiceId), { ...toInvoiceWriteData(changes), updatedAt: serverTimestamp() }); batch.set(doc(collection(db, 'invoices', invoiceId, 'history')), { ...toInvoiceHistoryWriteData(history), createdAt: serverTimestamp() }); await batch.commit(); } catch (error) { throw normalizeFirestoreError(error, 'commit', 'invoice'); } }
export async function createInvoice(data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>, history: HistoryInput): Promise<string> { try { const reference = doc(invoices); const batch = writeBatch(db); batch.set(reference, { ...toInvoiceWriteData(data), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); batch.set(doc(collection(reference, 'history')), { ...toInvoiceHistoryWriteData({ ...history, invoiceId: reference.id }), createdAt: serverTimestamp() }); await batch.commit(); return reference.id; } catch (error) { throw normalizeFirestoreError(error, 'create', 'invoice'); } }
export async function createInvoiceSeries(entries: Array<{ invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>; history: HistoryInput }>): Promise<string[]> { try { const batch = writeBatch(db); const references = entries.map(() => doc(invoices)); entries.forEach(({ invoice, history }, index) => { const reference = references[index]; batch.set(reference, { ...toInvoiceWriteData(invoice), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); batch.set(doc(collection(reference, 'history')), { ...toInvoiceHistoryWriteData({ ...history, invoiceId: reference.id }), createdAt: serverTimestamp() }); }); await batch.commit(); return references.map(reference => reference.id); } catch (error) { throw normalizeFirestoreError(error, 'create-series', 'invoice'); } }
export const updateInvoice = (id: string, changes: Partial<Invoice>, history: HistoryInput) => {
  const prepared: Record<string, unknown> = { ...changes };
  for (const field of ['referenceMonth', 'pixKey', 'pixKeyType', 'pixLink'] as const) {
    if (Object.prototype.hasOwnProperty.call(changes, field) && changes[field] === undefined) prepared[field] = deleteField();
  }
  return commit(id, prepared as Partial<Invoice> & Record<string, unknown>, history);
};
export const markInvoicePaid = (id: string, history: HistoryInput) => commit(id, { status: 'paid', paidAt: serverTimestamp(), suspendedAt: deleteField(), cancelledAt: deleteField() } as never, history);
export const suspendInvoice = (id: string, history: HistoryInput) => commit(id, { status: 'suspended', suspendedAt: serverTimestamp() } as never, history);
export const resumeInvoice = (id: string, history: HistoryInput) => commit(id, { status: 'pending', suspendedAt: deleteField() } as never, history);
export const cancelInvoice = (id: string, history: HistoryInput) => commit(id, { status: 'cancelled', cancelledAt: serverTimestamp() } as never, history);
export const replaceInvoiceBoleto = (id: string, boletoMediaId: string, history: HistoryInput) => commit(id, { boletoMediaId }, history);
export async function createInvoiceHistoryEntry(invoiceId: string, history: HistoryInput) { return commit(invoiceId, {}, history); }
export const reviewPaymentPromise = (id: string, promise: PaymentPromise, promisedPaymentDate: string | undefined, history: HistoryInput) => commit(id, { paymentPromise: { ...promise, reviewedAt: serverTimestamp() }, promisedPaymentDate } as never, history);
