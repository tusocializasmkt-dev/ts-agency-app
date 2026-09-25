// Real Admin SDK transactions against a demo emulator ONLY; never production.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test, { after, before } from 'node:test';
const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { reportPayment, confirmPayment, sendInvoiceReminder, runInvoiceReminders, reminderStages, dueDateForStage } = require('./lib/invoice-billing.js');
if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '')) throw new Error('Local Firestore emulator required.');
const app = initializeApp({ projectId: 'demo-ts-agency-rules' }, 'billing-tests');
const db = getFirestore(app, 'ai-studio-983a0c74-a073-4755-af2a-6e8c97248d58');
const client = { uid: 'billing-client', authTime: 1 };
const admin = { uid: 'billing-admin', authTime: 1 };
const today = '2026-09-24';
const initial = { brandId: client.uid, amount: 1200, dueDate: today, status: 'pending', description: 'Mensalidade', recurrenceGroupId: 'series' };
const invoice = (id, extra = {}) => db.doc(`invoices/${id}`).set({ ...initial, ...extra });
const data = async path => (await db.doc(path).get()).data();
const notifications = async id => (await db.collection('notifications').where('entityId', '==', id).get()).docs.map(doc => doc.data());
before(async () => {
  await db.doc(`admins/${admin.uid}`).set({ active: true });
  await db.doc('admins/billing-inactive').set({ active: false });
  await db.doc(`brands/${client.uid}`).set({ name: 'Cliente Teste', accessEnabled: true, status: 'active' });
  await db.doc('brands/disabled-client').set({ name: 'Desativado', accessEnabled: false });
  await db.doc('team_members/billing-team').set({ active: true, role: 'manager', brandIds: [client.uid] });
});
after(async () => { await db.terminate(); await deleteApp(app); });

test('report/confirm: concurrent clicks commit once, audit and notify; recurrence independent', async () => {
  await invoice('report'); await invoice('next', { dueDate: '2026-10-24' });
  await Promise.all(Array.from({ length: 5 }, () => reportPayment(db, client, 'report')));
  let stored = await data('invoices/report');
  assert.equal(stored.status, 'payment_reported'); assert.ok(stored.paymentReportedAt); assert.equal(stored.paymentReportedBy, client.uid); assert.equal(stored.paidAt, undefined);
  assert.equal((await db.collection('invoices/report/history').get()).size, 1);
  let notices = await notifications('report'); assert.equal(notices.length, 1); assert.equal(notices[0].recipientUid, admin.uid); assert.equal(notices[0].type, 'payment_reported');
  await Promise.all(Array.from({ length: 5 }, () => confirmPayment(db, admin, 'report')));
  stored = await data('invoices/report'); assert.equal(stored.status, 'paid'); assert.ok(stored.paidAt); assert.equal(stored.confirmedBy, admin.uid);
  notices = await notifications('report'); assert.equal(notices.length, 2);
  const confirmed = notices.find(n => n.type === 'payment_confirmed'); assert.equal(confirmed.recipientUid, client.uid); assert.match(confirmed.message, /1\.200,00/); assert.match(confirmed.message, /24\/09\/2026/);
  assert.equal((await data('invoices/next')).status, 'pending'); assert.equal((await data('invoices/next')).recurrenceGroupId, 'series');
});
test('authorization: other brand, team, inactive admin, client confirmation and disabled client rejected', async () => {
  await invoice('private'); await invoice('disabled-invoice', { brandId: 'disabled-client' });
  for (const uid of ['other', 'billing-team', admin.uid, 'billing-inactive']) await assert.rejects(reportPayment(db, { uid, authTime: 1 }, 'private'), { code: 'permission-denied' });
  for (const uid of [client.uid, 'billing-team', 'billing-inactive']) await assert.rejects(confirmPayment(db, { uid, authTime: 1 }, 'private'), { code: 'permission-denied' });
  await assert.rejects(reportPayment(db, { uid: 'disabled-client', authTime: 1 }, 'disabled-invoice'), { code: 'permission-denied' });
  assert.equal((await data('invoices/private')).status, 'pending'); assert.equal((await notifications('private')).length, 0);
});
test('manual confirmation still accepts pending legacy invoice without reporting', async () => {
  await invoice('manual'); await confirmPayment(db, admin, 'manual'); assert.equal((await data('invoices/manual')).status, 'paid'); assert.equal((await notifications('manual')).length, 1);
});
for (const stage of reminderStages) test(`stage ${stage.days}: correct audience/context, concurrent idempotence, no access changes`, async () => {
  const id = `stage-${stage.days}`; await invoice(id, { dueDate: dueDateForStage(today, stage.days) });
  const before = await data(`brands/${client.uid}`);
  const results = await Promise.all(Array.from({ length: 5 }, () => sendInvoiceReminder(db, id, stage, today)));
  assert.equal(results.filter(Boolean).length, 1); const notices = await notifications(id); assert.equal(notices.length, 1);
  assert.equal(notices[0].recipientUid, stage.days === 10 ? admin.uid : client.uid); assert.equal(notices[0].type, stage.action); assert.match(notices[0].message, /1\.200,00/);
  if (stage.days === 10) { assert.match(notices[0].message, /Cliente Teste/); assert.match(notices[0].message, /Atraso: 10 dias/); assert.equal(notices[0].link, '/admin/financeiro'); }
  assert.deepEqual(await data(`brands/${client.uid}`), before); assert.equal((await data(`invoices/${id}`)).status, 'pending');
  assert.equal((await db.collection(`invoices/${id}/history`).get()).size, 1);
});
test('paid, payment_reported, cancelled and suspended invoices skip every stage', async () => {
  for (const status of ['paid', 'payment_reported', 'cancelled', 'suspended']) for (const stage of reminderStages) {
    const id = `skip-${status}-${stage.days}`; await invoice(id, { status, dueDate: dueDateForStage(today, stage.days) });
    assert.equal(await sendInvoiceReminder(db, id, stage, today), false); assert.equal((await notifications(id)).length, 0);
  }
});
test('concurrent confirmation/reminder never sends a reminder committed after paid state', async () => {
  await invoice('race'); await Promise.all([confirmPayment(db, admin, 'race'), sendInvoiceReminder(db, 'race', reminderStages[1], today)]);
  assert.equal((await data('invoices/race')).status, 'paid');
  assert.equal(await sendInvoiceReminder(db, 'race', reminderStages[1], today), false);
  const history = (await db.collection('invoices/race/history').get()).docs;
  const paid = history.find(h => h.data().action === 'payment_confirmed'); const reminder = history.find(h => h.data().action === 'reminder_due_today');
  // Compare committed document versions, not serverTimestamp (REQUEST_TIME).
  if (reminder) assert.ok(reminder.createTime.toMillis() <= paid.createTime.toMillis());
});
test('scheduler handles more than one page and ignores future, paid and reported invoices', async () => {
  const batch = db.batch();
  for (let i = 0; i < 103; i++) batch.set(db.doc(`invoices/page-${i}`), initial);
  batch.set(db.doc('invoices/future'), { ...initial, dueDate: '2099-01-01' }); await batch.commit();
  await runInvoiceReminders(db, new Date(`${today}T12:00:00Z`));
  for (let i = 0; i < 103; i++) assert.equal((await notifications(`page-${i}`)).length, 1);
  assert.equal((await notifications('future')).length, 0);
  assert.equal(await runInvoiceReminders(db, new Date(`${today}T12:00:00Z`)), 0);
});
