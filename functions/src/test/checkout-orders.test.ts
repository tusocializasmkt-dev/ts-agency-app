import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes, createHmac } from 'node:crypto';
import { createMercadoPagoCheckout, mercadoPagoTransport } from '../mercado-pago-checkout.js';
import { createPaymentReader, mercadoPagoGet } from '../checkout-payment-provider.js';
import { verifyCheckoutNotification } from '../checkout-webhook-auth.js';
const order = () => ({ id: 'ORD123', type: 'online', processing_mode: 'manual', external_reference: 'local', currency: 'BRL', total_amount: '123.45', total_paid_amount: '123.45', status: 'processed', status_detail: 'accredited', user_id: '99', last_updated_date: '2026-09-28T00:00:00Z' });
test('Orders POST and GET use backend Authorization; retry has identical key/body', async () => {
  const original = globalThis.fetch; const calls: { url: string; options?: RequestInit }[] = [];
  const token = randomBytes(24).toString('hex');
  globalThis.fetch = async (url, options) => { calls.push({ url: String(url), options }); if (calls.length === 1) throw new Error('timeout'); return new Response(JSON.stringify({ ...order(), checkout_url: 'https://www.mercadopago.com.br/checkout/v1/redirect?order_id=ORD123' }), { status: 201 }); };
  try {
    const result = await createMercadoPagoCheckout(mercadoPagoTransport(token)).create({ invoiceId: 'invoice', externalReference: 'local', amountCents: 12345, currency: 'BRL', description: 'Fatura', expiresAt: '', idempotencyKey: 'uuid-attempt' });
    assert.equal(result.providerOrderId, 'ORD123'); assert.equal(calls.length, 2); assert.equal(calls[0].url, 'https://api.mercadopago.com/v1/orders'); assert.deepEqual(calls[0].options?.body, calls[1].options?.body);
    for (const call of calls) { assert.equal((call.options?.headers as any).Authorization, `Bearer ${token}`); assert.equal((call.options?.headers as any)['X-Idempotency-Key'], 'uuid-attempt'); }
    await mercadoPagoGet(token)('/v1/orders/ORD123'); assert.equal(calls[2].url, 'https://api.mercadopago.com/v1/orders/ORD123');
  } finally { globalThis.fetch = original; }
});
test('Orders reader queries ID, validates monetary strings and recognizes only accredited full payment', async () => {
  for (const [extra, status] of [[{}, 'approved'], [{ status: 'created' }, 'pending'], [{ status: 'processing' }, 'pending'], [{ status: 'action_required' }, 'pending'], [{ total_paid_amount: '12.00' }, 'unknown'], [{ status_detail: 'partially_refunded' }, 'refunded'], [{ status_detail: 'refunded' }, 'refunded'], [{ status: 'failed' }, 'rejected']] as const) {
    const result = await createPaymentReader(async path => { assert.equal(path, '/v1/orders/ORD123'); return { ...order(), ...extra }; }).getPayment('ORD123');
    assert.equal(result.status, status); assert.equal(result.providerOrderId, 'ORD123'); assert.equal(result.amountCents, 12345); assert.equal(result.collectorId, '99');
  }
  for (const extra of [{ id: 'ORDother' }, { total_amount: '1e2' }, { total_amount: '1.001' }, { last_updated_date: 'bad' }]) await assert.rejects(createPaymentReader(async () => ({ ...order(), ...extra })).getPayment('ORD123'));
  await assert.rejects(createPaymentReader(async () => { throw new Error('404'); }).getPayment('ORD123'));
});
test('order webhook authenticates lowercase data.id template and request ID, rejects tampering', () => {
  const secret = randomBytes(32).toString('hex'); const ts = String(Date.now()); const id = 'ORD123';
  const input = { method: 'POST', query: { 'data.id': id, type: 'order' }, body: { type: 'order', data: { id } }, headers: { 'x-request-id': 'request-1', 'x-signature': `ts=${ts},v1=${createHmac('sha256', secret).update(`id:${id.toLowerCase()};request-id:request-1;ts:${ts};`).digest('hex')}` } };
  assert.equal(verifyCheckoutNotification(input, secret)?.externalPaymentId, id);
  assert.throws(() => verifyCheckoutNotification({ ...input, headers: { ...input.headers, 'x-request-id': 'forged' } }, secret));
  assert.throws(() => verifyCheckoutNotification({ ...input, body: { type: 'order', data: { id: 'ORDother' } } }, secret));
});

test('Orders creation refuses wrong currency/reference and unsafe redirect without returning a URL', async () => {
  const input = { invoiceId: 'invoice', externalReference: 'local', amountCents: 12345, currency: 'BRL' as const, description: 'Fatura', expiresAt: '', idempotencyKey: 'attempt' };
  for (const extra of [{ currency: 'USD' }, { external_reference: 'foreign' }, { checkout_url: 'https://evil.test/checkout/pay' }, { id: '123' }]) {
    await assert.rejects(createMercadoPagoCheckout(async () => ({ ...order(), checkout_url: 'https://www.mercadopago.com.br/checkout/v1/redirect?order_id=ORD123', ...extra })).create(input));
  }
});
test('uncertain HTTP outcome never becomes a definitive rejection permitting a new order', async () => {
  const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => { if (++calls === 1) throw new Error('timeout'); return new Response('{}', { status: 400 }); };
  try { await assert.rejects(mercadoPagoTransport(randomBytes(24).toString('hex'))({}, 'same-key'), /checkout-outcome-unknown/); assert.equal(calls, 2); }
  finally { globalThis.fetch = original; }
});
