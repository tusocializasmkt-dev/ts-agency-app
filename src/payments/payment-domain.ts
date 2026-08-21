import type { Invoice, InvoiceStatus } from '../types';
import { ACTIVE_PAYMENT_STATUSES } from './payment.constants';
import { PaymentError } from './payment.errors';
import type { Payment, PaymentAttempt, PaymentMethod, PaymentStatus } from './payment.types';
export const isValidIdempotencyKey = (value: string) => /^[a-zA-Z0-9][a-zA-Z0-9_-]{15,127}$/.test(value);
export const createExternalReference = (invoiceId: string, paymentId: string) => `${invoiceId}/${paymentId}`;
export const isActivePaymentStatus = (status: PaymentStatus) => (ACTIVE_PAYMENT_STATUSES as readonly string[]).includes(status);
export const getActiveAttempts = (attempts: PaymentAttempt[]) => attempts.filter(item => ['created', 'pending', 'processing'].includes(item.status));
export const canPayInvoiceWithPix = (invoice: Invoice) => invoice.status === 'pending' || invoice.status === 'overdue';
export const isPixPastDisplayedExpiry = (payment: Pick<Payment, 'status' | 'expiresAt'>, now = new Date()) => payment.status === 'pending' && Boolean(payment.expiresAt && payment.expiresAt.getTime() <= now.getTime());
export function assertCanStartPayment(invoice: Invoice, method: PaymentMethod, idempotencyKey: string) { if (invoice.status === 'paid') throw new PaymentError('invoice-already-paid'); if (invoice.status === 'cancelled') throw new PaymentError('invoice-cancelled'); if (!['pix', 'credit_card', 'boleto'].includes(method)) throw new PaymentError('invalid-payment-method'); if (!isValidIdempotencyKey(idempotencyKey)) throw new PaymentError('duplicate-payment'); }
export function deriveInvoiceStatus(paymentStatus: PaymentStatus, current: InvoiceStatus): InvoiceStatus { if (paymentStatus === 'approved') return 'paid'; return current; }
export function assessApproval(invoice: Invoice, payments: Payment[], approvingPaymentId: string): 'settle-invoice' | 'duplicate-payment-review' { const otherApproved = payments.some(item => item.id !== approvingPaymentId && item.status === 'approved'); if (invoice.status === 'paid' || otherApproved) return 'duplicate-payment-review'; return 'settle-invoice'; }
