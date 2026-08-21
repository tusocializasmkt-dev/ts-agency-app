import { Timestamp, type DocumentData, type DocumentSnapshot } from 'firebase/firestore';
import type { Invoice, InvoiceHistory } from '../../types';
import { removeUndefined } from '../firebase';

export function mapInvoice(snapshot: DocumentSnapshot<DocumentData>): Invoice {
  const data = snapshot.data();
  const promise = data.paymentPromise;
  return {
    ...data,
    id: snapshot.id,
    boletoUrl: data.boletoUrl ?? data.pdfUrl,
    currency: data.currency ?? 'BRL', originalDueDate: data.originalDueDate ?? data.dueDate,
    paymentPromise: promise ? { ...promise, requestedDate: promise.requestedDate ?? promise.promiseDate ?? promise.date, reason: promise.reason ?? promise.description, promiseDate: promise.promiseDate ?? promise.date } : undefined,
  } as Invoice;
}
export const toInvoiceWriteData = (data: Partial<Invoice>) => { const { id: _id, ...record } = data; return removeUndefined(record); };
const toDate = (value: unknown) => value instanceof Date ? value : value instanceof Timestamp ? value.toDate() : value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function' ? value.toDate() : undefined;
export function mapInvoiceHistory(snapshot: DocumentSnapshot<DocumentData>): InvoiceHistory { const data = snapshot.data(); if (!data) throw new Error('Invoice history has no data.'); return { ...data, id: snapshot.id, createdAt: toDate(data.createdAt) } as InvoiceHistory; }
export const toInvoiceHistoryWriteData = (data: Omit<InvoiceHistory, 'id' | 'createdAt'>) => removeUndefined(data);
