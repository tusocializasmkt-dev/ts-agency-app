import assert from 'node:assert/strict';
import test from 'node:test';
import { checkoutInvoiceId, checkoutInvoiceVersion, invoiceAmountCents, safeCheckoutUrl } from '../invoice-checkout-domain.js';
import { createMercadoPagoCheckout } from '../mercado-pago-checkout.js';

test('checkout accepts single safe invoice IDs and ignores forged financial properties', () => {
  for (const invoiceId of ['', '../a', 'a/b', 'a\\b', 'a.b', 'a%2fb', 'a b', 'a?x', 'a'.repeat(129), 1]) assert.throws(() => checkoutInvoiceId({ invoiceId }), { code: 'invalid-argument' });
  assert.equal(checkoutInvoiceId({ invoiceId: 'inv_1-x', amount: 1, brandId: 'forged', status: 'paid', currency: 'USD' }), 'inv_1-x');
});
test('money and invoice version cover financial edits, not incidental timestamps', () => {
  for (const value of [0, 0.000000001, -1, NaN, Infinity, 1.001, Number.MAX_SAFE_INTEGER]) assert.throws(() => invoiceAmountCents(value));
  assert.equal(invoiceAmountCents(10.55), 1055);
  const invoice = { brandId: 'client', amount: 100, dueDate: '2026-09-26', status: 'pending' };
  assert.notEqual(checkoutInvoiceVersion(invoice), checkoutInvoiceVersion({ ...invoice, amount: 150 }));
  assert.equal(checkoutInvoiceVersion(invoice), checkoutInvoiceVersion({ ...invoice, status: 'overdue' }));
});
test('provider builds Orders checkout from authoritative BRL data and persisted idempotency key', async () => {
  let body: Record<string, unknown> | undefined; let key = '';
  const provider = createMercadoPagoCheckout(async (request, idempotencyKey) => { body = request; key = idempotencyKey; return { id: 'ORD123', currency: 'BRL', external_reference: 'local-payment', checkout_url: 'https://www.mercadopago.com.br/checkout/v1/redirect?order_id=ORD123' }; });
  const result = await provider.create({ invoiceId: 'inv', externalReference: 'local-payment', amountCents: 12345, currency: 'BRL', description: 'Mensalidade', expiresAt: '2026-10-01T00:00:00Z', idempotencyKey: 'attempt-1' });
  assert.equal(result.providerOrderId, 'ORD123'); assert.equal(body?.external_reference, 'local-payment');
  assert.equal(body?.type, 'online'); assert.equal(body?.processing_mode, 'manual'); assert.equal(body?.total_amount, '123.45');
  assert.deepEqual(body?.items, [{ title: 'Mensalidade', quantity: 1, unit_price: '123.45', total_amount: '123.45' }]);
  assert.equal(key, 'attempt-1'); assert.equal(body?.card_token, undefined);
  assert.deepEqual((body?.config as any).payment_method, { not_allowed_ids: ['pix'] });
});

test('unsafe or malformed provider results never become redirect targets', async () => {
  for (const value of ['http://www.mercadopago.com.br/checkout/pay', 'https://evil.test/checkout/pay', 'https://www.mercadopago.com.br.evil.test/checkout/pay', 'https://user@www.mercadopago.com.br/checkout/pay', 'https://www.mercadopago.com.br:999/checkout/pay', 'https://www.mercadopago.com.br/other']) assert.throws(() => safeCheckoutUrl(value));
  const provider = createMercadoPagoCheckout(async () => ({ id: 'p', init_point: 'https://evil.test/pay' }));
  await assert.rejects(provider.create({ invoiceId: 'i', externalReference: 'p', amountCents: 100, currency: 'BRL', description: 'Fatura', expiresAt: '2026-10-01T00:00:00Z', idempotencyKey: 'attempt-1' }));
});
