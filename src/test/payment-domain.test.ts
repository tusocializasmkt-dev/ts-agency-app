import { describe, expect, it } from 'vitest';
import type { Invoice } from '../types';
import type { Payment, PaymentAttempt } from '../payments';
import { assessApproval, assertCanStartPayment, createExternalReference, deriveInvoiceStatus, getActiveAttempts, isValidIdempotencyKey, mapPaymentError, MercadoPagoProvider, PaymentError } from '../payments';
const invoice = (status: Invoice['status'] = 'pending'): Invoice => ({ id: 'i', brandId: 'b', amount: 100, dueDate: '2026-01-01', status });
const payment = (id: string, status: Payment['status']): Payment => ({ id, invoiceId: 'i', brandId: 'b', provider: 'mercado_pago', method: 'pix', status, amountCents: 10000, amount: 100, currency: 'BRL', externalReference: `i/${id}`, idempotencyKey: `payment_key_${id}_123456` });
describe('payment domain', () => {
  it('mantém status de Invoice separado e somente approved liquida', () => { expect(deriveInvoiceStatus('approved', 'overdue')).toBe('paid'); expect(deriveInvoiceStatus('rejected', 'overdue')).toBe('overdue'); expect(deriveInvoiceStatus('expired', 'pending')).toBe('pending'); });
  it('valida idempotência e referência sem usar timestamp isolado', () => { expect(isValidIdempotencyKey('payment_key_123456789')).toBe(true); expect(isValidIdempotencyKey('123')).toBe(false); expect(createExternalReference('invoice', 'payment')).toBe('invoice/payment'); expect(() => assertCanStartPayment(invoice(), 'pix', 'curta')).toThrow(PaymentError); });
  it('preserva tentativas e identifica apenas as ativas', () => { const attempts = [{ id: '1', status: 'expired' }, { id: '2', status: 'pending' }] as PaymentAttempt[]; expect(getActiveAttempts(attempts).map(item => item.id)).toEqual(['2']); });
  it('detecta double payment sem sobrescrever histórico', () => { expect(assessApproval(invoice(), [payment('p1', 'approved'), payment('p2', 'processing')], 'p2')).toBe('duplicate-payment-review'); expect(assessApproval(invoice(), [payment('p2', 'processing')], 'p2')).toBe('settle-invoice'); });
  it('mapeia erro desconhecido sem expor provider', () => { expect(mapPaymentError(new Error('provider raw'))).toMatchObject({ code: 'payment-provider-unavailable' }); });
  it('provider stub falha explicitamente e nunca simula aprovação', async () => { const provider = new MercadoPagoProvider(); await expect(provider.createPixPayment({ invoiceId: 'i', method: 'pix', idempotencyKey: 'payment_key_123456789' })).rejects.toMatchObject({ code: 'payment-provider-not-configured' }); });
});
