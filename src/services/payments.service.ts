import type { Invoice } from '../types';
import type { CreatePaymentInput, Payment, PaymentStatus } from '../payments';
import { assertCanStartPayment, assessApproval, deriveInvoiceStatus, PaymentError } from '../payments';
import { getPayment, subscribeToInvoicePayments, subscribeToPaymentAttempts, subscribeToPaymentEvents } from '../data/repositories/payments.repository';
import { callCreatePaymentIntent, callCreatePixPayment } from '../data/functions';
import { subscribeToPayment } from '../data/repositories/payments.repository';
export const watchInvoicePayments = subscribeToInvoicePayments; export const watchPayment = subscribeToPayment; export const watchPaymentAttempts = subscribeToPaymentAttempts; export const watchPaymentEvents = subscribeToPaymentEvents; export const loadPayment = getPayment;
export function preparePaymentRequest(invoice: Invoice, input: CreatePaymentInput) { assertCanStartPayment(invoice, input.method, input.idempotencyKey); return { invoiceId: invoice.id, method: input.method, idempotencyKey: input.idempotencyKey, cardToken: input.cardToken }; }
export const createPaymentIntent = callCreatePaymentIntent;
export const createPixPayment = callCreatePixPayment;
export function createPayment(): never { throw new PaymentError('backend-required'); }
export function handlePaymentStatus(invoice: Invoice, payments: Payment[], paymentId: string, status: PaymentStatus) { return { invoiceStatus: deriveInvoiceStatus(status, invoice.status), approvalAction: status === 'approved' ? assessApproval(invoice, payments, paymentId) : undefined }; }
