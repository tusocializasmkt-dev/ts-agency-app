import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import test from 'node:test';
import { verifyCheckoutNotification, type WebhookInput } from '../checkout-webhook-auth.js';
import { handleCheckoutWebhook } from '../checkout-webhook.js';
import { createPaymentReader } from '../checkout-payment-provider.js';

// Ephemeral in-memory cryptographic test material; no credential or environment configuration.
const secret = randomBytes(32).toString('hex');
const now = Date.now();
const sign = (ts = String(now), id = '123', requestId = 'req-1'): WebhookInput => ({ method: 'POST', query: { 'data.id': id, type: 'payment' }, body: { type: 'payment', data: { id }, status: 'forged' }, headers: { 'x-request-id': requestId, 'x-signature': `ts=${ts},v1=${createHmac('sha256', secret).update(`id:${id.toLowerCase()};request-id:${requestId};ts:${ts};`).digest('hex')}` } });
test('signature accepts official HMAC template in seconds/milliseconds and durable replay key', () => {
  assert.equal(verifyCheckoutNotification(sign(), secret, now)?.externalPaymentId, '123');
  assert.equal(verifyCheckoutNotification(sign(String(Math.floor(now / 1000))), secret, now)?.stale, false);
  assert.deepEqual(verifyCheckoutNotification(sign(), secret, now), verifyCheckoutNotification(sign(), secret, now));
  assert.equal(verifyCheckoutNotification(sign(String(now - 900000)), secret, now)?.stale, true);
});
test('missing/invalid signature, duplicated query, future timestamp and body mismatch rejected', () => {
  for (const input of [
    { ...sign(), headers: {} }, { ...sign(), headers: { ...sign().headers, 'x-signature': 'invalid' } },
    { ...sign(), query: { 'data.id': ['123', '456'] } }, sign(String(now + 900000)),
    { ...sign(), body: { type: 'payment', data: { id: '456' } } }, { ...sign(), body: null },
    { ...sign(), query: { 'data.id': '../path' } },
  ]) assert.throws(() => verifyCheckoutNotification(input, secret, now));
  assert.throws(() => verifyCheckoutNotification(sign(), randomBytes(32).toString('hex'), now));
});
test('invalid or irrelevant webhook never initializes services or queries provider', async () => {
  const services = async (): Promise<never> => { throw new Error('must-not-initialize'); };
  assert.equal(await handleCheckoutWebhook({ ...sign(), headers: {} }, secret, services), 401);
  assert.equal(await handleCheckoutWebhook({ ...sign(), method: 'GET' }, secret, services), 405);
  assert.equal(await handleCheckoutWebhook(sign(), '', services), 503);
  assert.equal(await handleCheckoutWebhook({ ...sign(), query: { 'data.id': '123', type: 'merchant_order' }, body: { type: 'merchant_order', data: { id: '123' } } }, secret, services), 204);
});

const fixtures = () => ({
  '/v1/payments/123': { id: 123, external_reference: 'local', transaction_amount: 123.45, currency_id: 'BRL', collector_id: 99, live_mode: false, status: 'approved', date_last_updated: '2026-09-26T00:00:00Z', order: { type: 'mercadopago', id: 456 } },
  '/merchant_orders/456': { preference_id: 'pref-1', external_reference: 'local', collector: { id: 99 }, payments: [{ id: 123 }] },
  '/checkout/preferences/pref-1': { id: 'pref-1', collector_id: 99, external_reference: 'local', items: [{ id: 'invoice', quantity: 1, currency_id: 'BRL', unit_price: 123.45 }] },
} as Record<string, any>);
test('provider fetches payment/order/preference and returns minimal verified association', async () => {
  const data = fixtures(); const paths: string[] = [];
  const reader = createPaymentReader(async path => { paths.push(path); return data[path]; });
  const result = await reader.getPayment('123');
  assert.equal(result.associationValid, true); assert.equal(result.amountCents, 12345); assert.equal(result.invoiceId, 'invoice');
  assert.equal(result.externalReference, 'local'); assert.equal(result.preferenceId, 'pref-1'); assert.equal(paths.length, 3);
  assert.equal('payer' in result, false);
});
test('provider association discrepancies never pass as verified', async () => {
  for (const change of [
    (d: Record<string, any>) => { d['/merchant_orders/456'].external_reference = 'other'; },
    (d: Record<string, any>) => { d['/checkout/preferences/pref-1'].items[0].unit_price = 1; },
    (d: Record<string, any>) => { d['/merchant_orders/456'].payments = []; },
  ]) { const data = fixtures(); change(data); assert.equal((await createPaymentReader(async path => data[path]).getPayment('123')).associationValid, false); }
});
test('provider failures, timeout and malformed payments propagate without invented status', async () => {
  for (const error of [new Error('network'), new Error('timeout')]) await assert.rejects(createPaymentReader(async () => { throw error; }).getPayment('123'));
  await assert.rejects(createPaymentReader(async () => ({ id: 999 })).getPayment('123'));
  const data = fixtures(); data['/v1/payments/123'].date_last_updated = 'invalid';
  await assert.rejects(createPaymentReader(async path => data[path]).getPayment('123'));
});
test('search is bounded, deduplicated and never treats truncated results as complete', async () => {
  assert.deepEqual(await createPaymentReader(async path => { assert.match(path, /external_reference=local/); return { paging: { total: 2 }, results: [{ id: 123 }, { id: 123 }] }; }).searchPayments('local'), ['123']);
  await assert.rejects(createPaymentReader(async () => ({ paging: { total: 51 }, results: [] })).searchPayments('local'));
  await assert.rejects(createPaymentReader(async () => ({})).searchPayments('../path'));
});
