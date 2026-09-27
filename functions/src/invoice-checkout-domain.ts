import { createHash } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';

export interface CheckoutInvoice { brandId: string; amount: number; currency?: string; description?: string; dueDate: string; status: string }
export interface CheckoutInput { invoiceId: string; externalReference: string; amountCents: number; currency: 'BRL'; description: string; expiresAt: string }
export interface HostedCheckout { preferenceId: string; checkoutUrl: string }
export interface CheckoutProvider { create(input: CheckoutInput): Promise<HostedCheckout> }
// Only an explicit rejection known to have created no preference permits another POST.
export class CheckoutRejected extends Error { constructor() { super('checkout-rejected'); } }
export function checkoutInvoiceId(data: unknown): string {
  const id = (data as { invoiceId?: unknown } | null)?.invoiceId;
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new HttpsError('invalid-argument', 'Fatura inválida.');
  return id;
}
export function invoiceAmountCents(amount: number): number {
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount <= 0 || cents <= 0 || !Number.isSafeInteger(cents) || Math.abs(amount * 100 - cents) > 0.000001) throw new HttpsError('failed-precondition', 'Valor de fatura inválido.');
  return cents;
}
export function checkoutInvoiceVersion(invoice: CheckoutInvoice): string {
  return createHash('sha256').update(JSON.stringify([invoice.brandId, invoiceAmountCents(invoice.amount), invoice.currency || 'BRL', invoice.description || '', invoice.dueDate])).digest('hex');
}
export function assertCheckoutInvoice(invoice: CheckoutInvoice): void {
  if (!['pending', 'overdue'].includes(invoice.status)) throw new HttpsError('failed-precondition', invoice.status === 'payment_reported' ? 'Pagamento informado. Aguarde a conferência da agência.' : 'Esta fatura não aceita checkout.');
  invoiceAmountCents(invoice.amount);
  if (typeof invoice.brandId !== 'string' || !invoice.brandId || (invoice.currency && invoice.currency !== 'BRL') || typeof invoice.dueDate !== 'string') throw new HttpsError('failed-precondition', 'Fatura inválida.');
}
export function safeCheckoutUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('invalid-checkout-url');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !['www.mercadopago.com.br', 'mercadopago.com.br', 'sandbox.mercadopago.com.br', 'sandbox.mercadopago.com'].includes(url.hostname) || !url.pathname.includes('/checkout/')) throw new Error('invalid-checkout-url');
  return url.href;
}
