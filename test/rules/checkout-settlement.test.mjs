import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHmac, randomBytes } from 'node:crypto';
import test, { before, after } from 'node:test';
const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { processCheckoutEvent, reconcileCheckout } = require('./lib/checkout-payment-processing.js');
const { handleCheckoutWebhook } = require('./lib/checkout-webhook.js');
const { checkoutInvoiceVersion } = require('./lib/invoice-checkout-domain.js');
const { createInvoiceCheckout } = require('./lib/invoice-checkout.js');
const { confirmPayment, sendInvoiceReminder, reminderStages } = require('./lib/invoice-billing.js');
if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '')) throw new Error('Local emulator required');
const app = initializeApp({ projectId: 'demo-ts-agency-rules' }, 'settlement-tests');
const db = getFirestore(app, 'settlement-test-database');
const policy = { collectorId: '99', liveMode: false };
const invoice = { brandId: 'client', amount: 123.45, currency: 'BRL', dueDate: '2026-09-26', status: 'pending', recurrenceGroupId: 'series' };
let sequence = 1000;
const seed = async name => {
  await db.doc(`invoices/${name}`).set(invoice);
  await db.doc(`payments/${name}`).set({ invoiceId: name, brandId: 'client', provider: 'mercado_pago', integrationMode: 'checkout_pro', externalReference: name, amountCents: 12345, currency: 'BRL', invoiceVersion: checkoutInvoiceVersion(invoice), preferenceId: `pref-${name}`, status: 'ready', requiresReview: false, expiresAt: '2099-01-01T00:00:00Z', checkoutUrl: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=p' });
  await db.doc(`invoice_checkout_locks/${name}`).set({ paymentId: name });
  return { id: String(++sequence), externalReference: name, invoiceId: name, preferenceId: `pref-${name}`, amountCents: 12345, currency: 'BRL', collectorId: '99', liveMode: false, status: 'approved', updatedAtMs: 1000, refunded: false, associationValid: true };
};
const reader = remote => ({ getPayment: async () => remote, searchPayments: async () => [remote.id] });
const apply = (remote, event = `evt_${++sequence}`) => processCheckoutEvent(db, event, remote.id, reader(remote), policy);
const data = async path => (await db.doc(path).get()).data();
const notifications = async name => (await db.collection('notifications').where('entityId', '==', name).get()).docs.map(d => d.data());
before(async () => { await db.doc('admins/admin').set({ active: true }); await db.doc('admins/inactive').set({ active: false }); await db.doc('brands/client').set({ accessEnabled: true }); await db.doc('team_members/team').set({ active: true }); });
after(async () => { await db.terminate(); await deleteApp(app); });

test('approved direct, duplicate delivery and concurrent different events settle exactly once', async () => {
  const remote = await seed('approved'); await db.doc('invoices/next').set({ ...invoice, dueDate: '2026-10-26' });
  await Promise.all([apply(remote, 'same'), apply(remote, 'same'), apply(remote), apply(remote)]);
  assert.equal((await data('invoices/approved')).status, 'paid');
  assert.equal((await data('invoices/approved')).settlementPaymentId, `mercado_pago:${remote.id}`);
  assert.equal((await data('invoices/approved')).confirmedBy, undefined);
  assert.equal((await db.collection('invoices/approved/history').get()).size, 1);
  assert.equal((await notifications('approved')).length, 1);
  assert.equal((await data('invoices/next')).status, 'pending');
  assert.equal(await sendInvoiceReminder(db, 'approved', reminderStages[1], '2026-09-26'), false);
});
test('pending/in_process/rejected/cancelled/expired do not settle or freeze reminders', async () => {
  for (const status of ['pending', 'in_process', 'rejected', 'cancelled', 'expired']) {
    const remote = { ...await seed(`status-${status}`), status };
    await apply(remote);
    assert.equal((await data(`invoices/${remote.invoiceId}`)).status, 'pending');
    assert.equal((await data(`payments/${remote.invoiceId}`)).providerStatus, status);
    assert.equal(await sendInvoiceReminder(db, remote.invoiceId, reminderStages[1], '2026-09-26'), true);
  }
});
test('declined payment reuses the existing preference instead of creating another charge', async () => {
  const remote = { ...await seed('retry-declined'), status: 'rejected' }; await apply(remote);
  let calls = 0;
  const result = await createInvoiceCheckout(db, 'client', { invoiceId: 'retry-declined' }, { create: async () => { calls++; throw new Error(); } });
  assert.match(result.checkoutUrl, /mercadopago/); assert.equal(calls, 0);
});
test('rejection of one external payment does not reopen checkout while another is pending', async () => {
  const remote = await seed('multiple-pending');
  await apply({ ...remote, status: 'pending' });
  await apply({ ...remote, id: String(++sequence), status: 'rejected' });
  assert.equal((await data('payments/multiple-pending')).status, 'pending');
  await assert.rejects(createInvoiceCheckout(db, 'client', { invoiceId: 'multiple-pending' }, { create: async () => { throw new Error('must-not-create'); } }), { code: 'failed-precondition' });
});
test('unknown/refund/chargeback/contested require review without reopening paid invoice or duplicate notices', async () => {
  for (const status of ['unknown', 'refunded', 'charged_back', 'contested', 'in_mediation']) {
    const remote = await seed(`critical-${status}`); await apply(remote);
    const critical = { ...remote, status, updatedAtMs: 2000 }; await apply(critical); await apply(critical);
    assert.equal((await data(`invoices/${remote.invoiceId}`)).status, 'paid');
    assert.equal((await data(`payments/${remote.invoiceId}`)).requiresReview, true);
    const ns = await notifications(remote.invoiceId); assert.equal(ns.filter(n => n.type === 'payment_confirmed').length, 1); assert.equal(ns.filter(n => n.type === 'checkout_review').length, 1);
    assert.equal((await data('brands/client')).accessEnabled, true);
  }
});
test('older provider snapshots cannot regress approval, newer impossible regression requires review', async () => {
  const remote = await seed('out-of-order'); await apply({ ...remote, updatedAtMs: 3000 });
  assert.equal((await apply({ ...remote, status: 'pending', updatedAtMs: 1000 })).outcome, 'stale');
  assert.equal((await data('payments/out-of-order')).providerStatus, 'approved');
  assert.equal((await apply({ ...remote, status: 'pending', updatedAtMs: 4000 })).outcome, 'requires_review');
  assert.equal((await data('invoices/out-of-order')).status, 'paid');
});
test('money/currency/reference/brand/preference/collector/mode mismatches never settle', async () => {
  const variations = [ { amountCents: 1 }, { currency: 'USD' }, { invoiceId: 'other' }, { preferenceId: 'other' }, { collectorId: 'other' }, { liveMode: true }, { associationValid: false } ];
  for (let i = 0; i < variations.length; i++) {
    const remote = await seed(`mismatch-${i}`); assert.equal((await apply({ ...remote, ...variations[i] })).outcome, 'requires_review'); assert.equal((await data(`invoices/mismatch-${i}`)).status, 'pending');
  }
  const brand = await seed('wrong-brand'); await db.doc('invoices/wrong-brand').update({ brandId: 'other' }); await apply(brand); assert.equal((await data('payments/wrong-brand')).requiresReview, true);
  const ref = await seed('wrong-ref'); await apply({ ...ref, externalReference: 'absent' }); assert.equal((await data('invoices/wrong-ref')).status, 'pending');
});
test('missing invoice and closed/manual-reported invoices require review', async () => {
  for (const status of ['missing', 'cancelled', 'suspended', 'payment_reported']) {
    const remote = await seed(`closed-${status}`);
    if (status === 'missing') await db.doc(`invoices/${remote.invoiceId}`).delete(); else await db.doc(`invoices/${remote.invoiceId}`).update({ status });
    assert.equal((await apply(remote)).outcome, 'requires_review');
  }
});
test('event before local association is durable and same event can recover later', async () => {
  const remote = await seed('early'); const local = await data('payments/early'); await db.doc('payments/early').delete();
  assert.equal((await apply(remote, 'early-event')).retryable, true); assert.equal((await data('checkout_webhook_events/early-event')).status, 'retryable');
  await db.doc('payments/early').set(local); assert.equal((await apply(remote, 'early-event')).outcome, 'approved'); assert.equal((await data('invoices/early')).status, 'paid');
});
test('query failure/timeout persist retryable event and retry can recover', async () => {
  for (const message of ['query-failed', 'timeout']) {
    const remote = await seed(message);
    assert.equal((await processCheckoutEvent(db, message, remote.id, { ...reader(remote), getPayment: async () => { throw new Error(message); } }, policy)).retryable, true);
    assert.equal((await data(`checkout_webhook_events/${message}`)).status, 'retryable'); await apply(remote, message); assert.equal((await data(`invoices/${message}`)).status, 'paid');
  }
});
test('manual Pix followed by approved signals possible duplicate without second customer confirmation', async () => {
  const remote = await seed('manual-first'); await confirmPayment(db, { uid: 'admin', authTime: 1 }, remote.invoiceId); await apply(remote); await apply(remote);
  assert.equal((await data('payments/manual-first')).reviewReason, 'possible_duplicate_payment');
  const ns = await notifications('manual-first'); assert.equal(ns.filter(n => n.recipientUid === 'client').length, 1); assert.equal(ns.filter(n => n.type === 'checkout_review').length, 1);
});
test('Admin/webhook race commits one settlement and keeps deterministic history/notification', async () => {
  const remote = await seed('race'); await Promise.all([confirmPayment(db, { uid: 'admin', authTime: 1 }, 'race'), apply(remote)]);
  assert.equal((await db.collection('invoices/race/history').get()).size, 1);
  assert.equal((await notifications('race')).filter(n => n.recipientUid === 'client').length, 1);
  assert.equal((await data('invoices/race')).status, 'paid');
});
test('second external approved payment for same preference is duplicate review, not second settlement', async () => {
  const remote = await seed('two-payments'); await apply(remote); await apply({ ...remote, id: String(++sequence) });
  assert.equal((await data('payments/two-payments')).reviewReason, 'possible_duplicate_payment'); assert.equal((await db.collection('invoices/two-payments/history').get()).size, 1);
});
test('reconciliation denies anonymous/client/team/inactive before provider consultation', async () => {
  const remote = await seed('admin-only'); let calls = 0;
  const provider = { ...reader(remote), searchPayments: async () => { calls++; return [remote.id]; } };
  for (const uid of ['', 'client', 'team', 'inactive']) await assert.rejects(reconcileCheckout(db, uid, { paymentId: 'admin-only' }, provider, policy));
  assert.equal(calls, 0);
  assert.equal((await reconcileCheckout(db, 'admin', { paymentId: 'admin-only', amount: 1, status: 'paid' }, provider, policy))[0].outcome, 'approved'); assert.equal(calls, 1);
});
test('reconciliation pending/unknown, empty search and early event recovery are safe', async () => {
  for (const status of ['pending', 'unknown']) {
    const remote = { ...await seed(`reconcile-${status}`), status }; await reconcileCheckout(db, 'admin', { paymentId: remote.invoiceId }, reader(remote), policy);
    assert.equal((await data(`invoices/${remote.invoiceId}`)).status, 'pending');
  }
  const remote = await seed('empty-search'); await reconcileCheckout(db, 'admin', { paymentId: remote.invoiceId }, { ...reader(remote), searchPayments: async () => [] }, policy);
  assert.equal((await data('payments/empty-search')).requiresReview, true);
  await db.doc('checkout_webhook_events/recover-event').set({ externalPaymentId: remote.id, status: 'retryable' });
  await reconcileCheckout(db, 'admin', { eventId: 'recover-event' }, reader(remote), policy);
  assert.equal((await data('invoices/empty-search')).status, 'paid'); assert.equal((await data('checkout_webhook_events/recover-event')).status, 'processed');
});
test('webhook during creation does not get overwritten by late preference response', async () => {
  await db.doc('invoices/creating-race').set(invoice);
  const provider = { async create(input) {
    const remote = { id: String(++sequence), externalReference: input.externalReference, invoiceId: input.invoiceId, preferenceId: 'pref-race', amountCents: 12345, currency: 'BRL', collectorId: '99', liveMode: false, status: 'approved', updatedAtMs: 1000, refunded: false, associationValid: true };
    await apply(remote); return { preferenceId: 'pref-race', checkoutUrl: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=p' };
  } };
  await assert.rejects(createInvoiceCheckout(db, 'client', { invoiceId: 'creating-race' }, provider), { code: 'failed-precondition' });
  const lock = await data('invoice_checkout_locks/creating-race'); assert.equal((await data(`payments/${lock.paymentId}`)).status, 'approved'); assert.equal((await data('invoices/creating-race')).status, 'paid');
});
test('HTTP signature-to-provider flow ignores forged body; replay window only allows durable retries', async () => {
  const remote = await seed('http'); const secret = randomBytes(32).toString('hex');
  const input = ts => ({ method: 'POST', query: { 'data.id': remote.id, type: 'payment' }, body: { type: 'payment', data: { id: remote.id }, status: 'rejected', amount: 1 }, headers: { 'x-request-id': 'http-request', 'x-signature': `ts=${ts},v1=${createHmac('sha256', secret).update(`id:${remote.id};request-id:http-request;ts:${ts};`).digest('hex')}` } });
  const services = async () => ({ db, reader: reader(remote), policy });
  const stale = input(String(Date.now() - 900000)); assert.equal(await handleCheckoutWebhook(stale, secret, services), 401);
  const fresh = input(String(Date.now())); assert.equal(await handleCheckoutWebhook(fresh, secret, services), 200); assert.equal(await handleCheckoutWebhook(fresh, secret, services), 200);
  assert.equal((await data('invoices/http')).status, 'paid');
});
