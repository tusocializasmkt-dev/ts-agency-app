import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHmac, randomBytes } from 'node:crypto';
import test, { before, after } from 'node:test';
const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { createInvoiceCheckout } = require('./lib/invoice-checkout.js');
const { createMercadoPagoCheckout } = require('./lib/mercado-pago-checkout.js');
const { createPaymentReader } = require('./lib/checkout-payment-provider.js');
const { processCheckoutEvent, reconcileCheckout } = require('./lib/checkout-payment-processing.js');
const { handleCheckoutWebhook } = require('./lib/checkout-webhook.js');
const { manageInvoices } = require('./lib/invoice-management.js');
if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '')) throw new Error('Local emulator required');
const app = initializeApp({ projectId: 'demo-ts-agency-rules' }, 'orders-tests'); const db = getFirestore(app, 'orders-test-database');
const policy = { collectorId: '99', liveMode: false }; let sequence = 0;
const data = async path => (await db.doc(path).get()).data();
before(async () => { await db.doc('admins/admin').set({ active: true }); await db.doc('brands/client').set({ accessEnabled: true }); await db.doc('team_members/team').set({ active: true }); });
after(async () => { await db.terminate(); await deleteApp(app); });
async function seed() {
  const invoiceId = `invoice${++sequence}`, id = `ORD${sequence}`; let reference;
  await db.doc(`invoices/${invoiceId}`).set({ brandId: 'client', amount: 123.45, currency: 'BRL', dueDate: '2026-10-01', status: 'pending' });
  await createInvoiceCheckout(db, 'client', { invoiceId, amount: 1, currency: 'USD' }, createMercadoPagoCheckout(async (body, key) => {
    assert.equal(body.total_amount, '123.45'); assert.match(key, /^[a-f0-9-]{36}$/); reference = body.external_reference;
    return { id, currency: 'BRL', external_reference: reference, checkout_url: `https://www.mercadopago.com.br/checkout/v1/redirect?order_id=${id}` };
  }));
  const order = { id, type: 'online', processing_mode: 'manual', currency: 'BRL', user_id: '99', external_reference: reference, total_amount: '123.45', total_paid_amount: '123.45', status: 'processed', status_detail: 'accredited', last_updated_date: '2026-09-28T00:00:00Z' };
  return { invoiceId, reference, order };
}
const reader = order => createPaymentReader(async path => { assert.equal(path, `/v1/orders/${order.id}`); return order; });
test('order signed webhook queries provider, settles once across duplicates/concurrency and protects deletion', async () => {
  const { invoiceId, reference, order } = await seed(); const secret = randomBytes(32).toString('hex'); const ts = String(Date.now());
  const input = { method: 'POST', query: { 'data.id': order.id, type: 'order' }, body: { type: 'order', data: { id: order.id }, status: 'forged' }, headers: { 'x-request-id': 'request', 'x-signature': `ts=${ts},v1=${createHmac('sha256', secret).update(`id:${order.id.toLowerCase()};request-id:request;ts:${ts};`).digest('hex')}` } };
  const services = async () => ({ db, reader: reader(order), policy });
  const results = await Promise.all([handleCheckoutWebhook(input, secret, services), handleCheckoutWebhook(input, secret, services), reconcileCheckout(db, 'admin', { paymentId: reference }, reader(order), policy)]);
  assert.equal(results[0], 200); assert.equal(results[1], 200); assert.equal((await data(`invoices/${invoiceId}`)).status, 'paid');
  assert.equal((await data(`payments/${reference}`)).providerOrderId, order.id);
  assert.equal((await db.collection(`invoices/${invoiceId}/history`).get()).size, 1);
  assert.equal((await db.collection('notifications').where('entityId', '==', invoiceId).where('type', '==', 'payment_confirmed').get()).size, 1);
  const preview = await manageInvoices(db, 'admin', { phase: 'preview', action: 'delete', invoiceId });
  assert.equal(preview.removed, 0);
});
test('Orders reconciliation requires Admin, uses persisted ID and leaves browser-return invoice pending', async () => {
  const { invoiceId, reference, order } = await seed(); assert.equal((await data(`invoices/${invoiceId}`)).status, 'pending');
  for (const uid of ['', 'client', 'team']) await assert.rejects(reconcileCheckout(db, uid, { paymentId: reference }, reader(order), policy));
  const result = await reconcileCheckout(db, 'admin', { paymentId: reference }, reader(order), policy); assert.equal(result[0].outcome, 'approved');
});
test('Orders divergent reference/amount/currency/seller/status never settle', async () => {
  for (const extra of [{ external_reference: 'missing' }, { total_amount: '10.00' }, { currency: 'USD' }, { user_id: '88' }, { status: 'processing' }, { status_detail: 'partially_refunded' }, { total_paid_amount: '1.00' }, { type: 'point' }]) {
    const { invoiceId, reference, order } = await seed();
    await reconcileCheckout(db, 'admin', { paymentId: reference }, reader({ ...order, ...extra }), policy);
    assert.equal((await data(`invoices/${invoiceId}`)).status, 'pending');
  }
});
test('Orders unavailable and mismatched IDs remain retryable without settlement', async () => {
  const { invoiceId, reference, order } = await seed();
  for (const get of [async () => { throw new Error('404'); }, async () => ({ ...order, id: 'ORDother' })]) {
    const results = await reconcileCheckout(db, 'admin', { paymentId: reference }, createPaymentReader(get), policy); assert.equal(results[0].retryable, true);
  }
  assert.equal((await data(`invoices/${invoiceId}`)).status, 'pending');
});
