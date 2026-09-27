import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test, { after, before } from 'node:test';
const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { createInvoiceCheckout } = require('./lib/invoice-checkout.js');
const { CheckoutRejected, checkoutInvoiceVersion } = require('./lib/invoice-checkout-domain.js');
const { confirmPayment } = require('./lib/invoice-billing.js');
const { settleInvoice } = require('./lib/invoice-settlement.js');
if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '')) throw new Error('Local emulator required');
const app = initializeApp({ projectId: 'demo-ts-agency-rules' }, 'checkout-tests');
const db = getFirestore(app, 'checkout-test-database');
const invoice = { brandId: 'client', amount: 150.25, currency: 'BRL', dueDate: '2026-10-01', description: 'Mensalidade', status: 'pending', recurrenceGroupId: 'series' };
const url = 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=p';
const put = (id, extra = {}) => db.doc(`invoices/${id}`).set({ ...invoice, ...extra });
const good = () => { const calls = []; return { calls, async create(input) { calls.push(input); return { preferenceId: 'p', checkoutUrl: url }; } }; };
before(async () => { await db.doc('brands/client').set({ accessEnabled: true }); await db.doc('brands/disabled').set({ accessEnabled: false }); await db.doc('admins/admin').set({ active: true }); await db.doc('admins/inactive').set({ active: false }); await db.doc('team_members/team').set({ active: true, role: 'manager' }); });
after(async () => { await db.terminate(); await deleteApp(app); });
test('own invoice, authoritative amount and reuse; no invoice mutation or settlement from redirects', async () => {
  await put('own'); await put('next', { dueDate: '2026-11-01' }); const provider = good();
  const response = await createInvoiceCheckout(db, 'client', { invoiceId: 'own', amount: 1, brandId: 'other', currency: 'USD', description: 'forged', status: 'paid' }, provider);
  assert.deepEqual(Object.keys(response).sort(), ['checkoutUrl', 'expiresAt']); assert.equal(response.checkoutUrl, url);
  assert.equal(provider.calls[0].amountCents, 15025); assert.equal(provider.calls[0].description, 'Mensalidade'); assert.equal(provider.calls[0].currency, 'BRL');
  await createInvoiceCheckout(db, 'client', { invoiceId: 'own', success: true, payment_status: 'approved' }, provider); assert.equal(provider.calls.length, 1);
  const record = (await db.collection('payments').where('invoiceId', '==', 'own').get()).docs[0]; assert.notEqual(record.id, record.data().preferenceId);
  assert.deepEqual((await db.doc('invoices/own').get()).data(), invoice); assert.equal((await db.doc('invoices/next').get()).data().status, 'pending');
});
test('authorization: missing auth, foreign invoice, team, inactive admin, disabled client, absent invoice', async () => {
  await put('private'); await put('disabled-invoice', { brandId: 'disabled' }); const provider = good();
  for (const [uid, id, code] of [['', 'private', 'unauthenticated'], ['team', 'private', 'permission-denied'], ['inactive', 'private', 'permission-denied'], ['disabled', 'disabled-invoice', 'permission-denied'], ['client', 'missing', 'not-found']]) await assert.rejects(createInvoiceCheckout(db, uid, { invoiceId: id }, provider), { code });
  await put('foreign', { brandId: 'other' }); await assert.rejects(createInvoiceCheckout(db, 'client', { invoiceId: 'foreign' }, provider), { code: 'permission-denied' }); assert.equal(provider.calls.length, 0);
  await createInvoiceCheckout(db, 'admin', { invoiceId: 'foreign' }, provider); assert.equal(provider.calls.length, 1);
});
test('terminal, suspended and payment_reported states cannot start checkout', async () => {
  const provider = good(); for (const status of ['paid', 'cancelled', 'suspended', 'payment_reported', 'unknown']) { await put(status, { status }); await assert.rejects(createInvoiceCheckout(db, 'client', { invoiceId: status }, provider), { code: 'failed-precondition' }); } assert.equal(provider.calls.length, 0);
});
test('concurrent calls reserve once and make exactly one external request', async () => {
  await put('concurrent'); const provider = good();
  const results = await Promise.allSettled(Array.from({ length: 5 }, () => createInvoiceCheckout(db, 'client', { invoiceId: 'concurrent' }, provider)));
  assert.ok(results.some(r => r.status === 'fulfilled')); assert.equal(provider.calls.length, 1); assert.equal((await db.collection('payments').where('invoiceId', '==', 'concurrent').get()).size, 1);
  for (const result of results) if (result.status === 'rejected') assert.equal(result.reason.code, 'failed-precondition');
});
test('definitive rejection permits explicit retry; uncertain outcome blocks every retry', async () => {
  await put('failed'); let calls = 0; const rejected = { async create() { calls++; throw new CheckoutRejected(); } };
  await assert.rejects(createInvoiceCheckout(db, 'client', { invoiceId: 'failed' }, rejected), { code: 'unavailable' });
  const provider = good(); await createInvoiceCheckout(db, 'client', { invoiceId: 'failed' }, provider); assert.equal(provider.calls.length, 1);
  await put('uncertain'); const unknown = { async create() { calls++; throw new Error('timeout'); } };
  await assert.rejects(createInvoiceCheckout(db, 'client', { invoiceId: 'uncertain' }, unknown), { code: 'failed-precondition' });
  await assert.rejects(createInvoiceCheckout(db, 'client', { invoiceId: 'uncertain' }, unknown), { code: 'failed-precondition' }); assert.equal(calls, 2);
  const record = (await db.collection('payments').where('invoiceId', '==', 'uncertain').get()).docs[0].data(); assert.equal(record.status, 'unknown'); assert.equal(record.reconciliationRequired, true);
});
test('persist failure after external success never issues a second POST', async () => {
  await put('persist-failure'); const provider = good(); let transactions = 0;
  const wrapped = { doc: path => db.doc(path), collection: path => db.collection(path), runTransaction: callback => { if (++transactions === 2) throw new Error('persistence-failed'); return db.runTransaction(callback); } };
  await assert.rejects(createInvoiceCheckout(wrapped, 'client', { invoiceId: 'persist-failure' }, provider));
  await assert.rejects(createInvoiceCheckout(db, 'client', { invoiceId: 'persist-failure' }, provider), { code: 'failed-precondition' }); assert.equal(provider.calls.length, 1);
});
test('financial edit during request quarantines preference; no URL reused after edits or expiry', async () => {
  await put('edited'); const provider = { async create() { await db.doc('invoices/edited').update({ amount: 999 }); return { preferenceId: 'p-edited', checkoutUrl: url }; } };
  await assert.rejects(createInvoiceCheckout(db, 'client', { invoiceId: 'edited' }, provider), { code: 'failed-precondition' });
  const record = (await db.collection('payments').where('invoiceId', '==', 'edited').get()).docs[0].data(); assert.equal(record.status, 'requires_review'); assert.equal(record.preferenceId, 'p-edited');
  await put('expired'); const p = good(); await createInvoiceCheckout(db, 'client', { invoiceId: 'expired' }, p, () => new Date('2026-09-01T00:00:00Z'));
  await assert.rejects(createInvoiceCheckout(db, 'client', { invoiceId: 'expired' }, p, () => new Date('2026-09-02T00:00:00Z')), { code: 'failed-precondition' }); assert.equal(p.calls.length, 1);
});
test('manual settlement remains idempotent during checkout; future provider path cannot impersonate Admin', async () => {
  await put('manual'); await createInvoiceCheckout(db, 'client', { invoiceId: 'manual' }, good());
  await confirmPayment(db, { uid: 'admin', authTime: 1 }, 'manual'); await confirmPayment(db, { uid: 'admin', authTime: 1 }, 'manual');
  assert.equal((await db.doc('invoices/manual').get()).data().confirmedBy, 'admin'); assert.equal((await db.collection('invoices/manual/history').get()).size, 1);
  await put('future'); const ref = db.doc('invoices/future'); const origin = { kind: 'verified_provider', paymentId: 'external-payment', brandId: 'client', amountCents: 15025, currency: 'BRL', invoiceVersion: checkoutInvoiceVersion(invoice) };
  const apply = value => db.runTransaction(async tx => settleInvoice(db, tx, ref, (await tx.get(ref)).data(), value));
  assert.equal(await apply({ ...origin, amountCents: 1 }), 'requires_review'); assert.equal(await apply(origin), 'paid'); assert.equal(await apply(origin), 'already_paid'); assert.equal(await apply({ ...origin, paymentId: 'second' }), 'requires_review');
  const stored = (await ref.get()).data(); assert.equal(stored.confirmedBy, undefined); assert.equal(stored.confirmationSource, 'mercado_pago');
  assert.equal((await ref.collection('history').doc('payment_confirmed').get()).data().actorRole, 'system');
});
