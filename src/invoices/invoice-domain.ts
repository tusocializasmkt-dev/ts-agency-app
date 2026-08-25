import type { Invoice, InvoiceStatus, PaymentPromise, YearMonth } from '../types';
import { MAX_INVOICE_RECURRENCE_MONTHS, PAYMENT_PROMISE_MAX_DAYS, PAYMENT_PROMISE_REASON_MAX_LENGTH, PAYMENT_PROMISE_REASON_MIN_LENGTH } from './invoice.constants';
export type InvoiceErrorCode = 'invalid-amount' | 'invalid-date' | 'invalid-transition' | 'invalid-url' | 'promise-not-allowed' | 'promise-date-invalid' | 'promise-pending' | 'invalid-reason' | 'invalid-recurrence-month' | 'invalid-recurrence-range' | 'invalid-recurrence-day' | 'recurrence-too-long';
export class InvoiceError extends Error { constructor(public readonly code: InvoiceErrorCode) { super(code); this.name = 'InvoiceError'; } }
const civil = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
};
export const formatCurrencyBRL = (amount: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
export function getEffectiveInvoiceStatus(invoice: Invoice, now = new Date()): InvoiceStatus { if (invoice.status !== 'pending') return invoice.status; const due = civil(invoice.dueDate); return due && due.getTime() < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) ? 'overdue' : 'pending'; }
export function validateInvoiceAmount(amount: number) { if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) throw new InvoiceError('invalid-amount'); }
export function validateCivilDate(value: string) { if (!civil(value)) throw new InvoiceError('invalid-date'); }
export function validatePixLink(value?: string) { if (!value) return; try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); } catch { throw new InvoiceError('invalid-url'); } }
const parseMonth = (value: YearMonth) => { const match = /^(\d{4})-(\d{2})$/.exec(value); if (!match) throw new InvoiceError('invalid-recurrence-month'); const year = Number(match[1]); const month = Number(match[2]); if (month < 1 || month > 12) throw new InvoiceError('invalid-recurrence-month'); return { year, month }; };
export interface InvoiceRecurrence { start: YearMonth; end: YearMonth; day: number; }
export function buildRecurringDueDates(recurrence: InvoiceRecurrence): Array<{ referenceMonth: YearMonth; dueDate: string }> {
  const start = parseMonth(recurrence.start); const end = parseMonth(recurrence.end);
  if (!Number.isInteger(recurrence.day) || recurrence.day < 1 || recurrence.day > 31) throw new InvoiceError('invalid-recurrence-day');
  const startIndex = start.year * 12 + start.month - 1; const endIndex = end.year * 12 + end.month - 1;
  if (endIndex < startIndex) throw new InvoiceError('invalid-recurrence-range');
  const total = endIndex - startIndex + 1;
  if (total > MAX_INVOICE_RECURRENCE_MONTHS) throw new InvoiceError('recurrence-too-long');
  return Array.from({ length: total }, (_, index) => { const absolute = startIndex + index; const year = Math.floor(absolute / 12); const monthIndex = absolute % 12; const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate(); const day = Math.min(recurrence.day, lastDay); const referenceMonth = `${year}-${String(monthIndex + 1).padStart(2, '0')}` as YearMonth; return { referenceMonth, dueDate: `${referenceMonth}-${String(day).padStart(2, '0')}` }; });
}
export function assertInvoiceTransition(current: InvoiceStatus, next: InvoiceStatus) { const allowed: Record<InvoiceStatus, InvoiceStatus[]> = { pending: ['paid', 'suspended', 'cancelled'], overdue: ['paid', 'suspended', 'cancelled'], suspended: ['pending', 'cancelled'], paid: [], cancelled: [] }; if (!allowed[current].includes(next)) throw new InvoiceError('invalid-transition'); }
export function validatePaymentPromise(invoice: Invoice, requestedDate: string, reason: string, now = new Date()): PaymentPromise { if (getEffectiveInvoiceStatus(invoice, now) !== 'overdue' || ['paid', 'cancelled', 'suspended'].includes(invoice.status)) throw new InvoiceError('promise-not-allowed'); if (invoice.paymentPromise?.status === 'pending') throw new InvoiceError('promise-pending'); const requested = civil(requestedDate); const due = civil(invoice.dueDate); const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()); if (!requested || !due || requested.getTime() < today || requested.getTime() > due.getTime() + PAYMENT_PROMISE_MAX_DAYS * 86400000) throw new InvoiceError('promise-date-invalid'); const clean = reason.trim(); if (clean.length < PAYMENT_PROMISE_REASON_MIN_LENGTH || clean.length > PAYMENT_PROMISE_REASON_MAX_LENGTH) throw new InvoiceError('invalid-reason'); return { requestedDate, reason: clean, status: 'pending' }; }
