import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test, { before, after } from 'node:test';
const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { manageInvoices } = require('./lib/invoice-management.js');
const { checkoutInvoiceVersion } = require('./lib/invoice-checkout-domain.js');
const { createInvoiceCheckout } = require('./lib/invoice-checkout.js');
const { sendInvoiceReminder, reminderStages, confirmPayment } = require('./lib/invoice-billing.js');
if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '')) throw new Error('Local emulator required');
const app = initializeApp({ projectId: 'demo-ts-agency-rules' }, 'management-tests');
const db = getFirestore(app, 'management-test-database');
const now = new Date('2026-10-01T12:00:00Z');
const base = { brandId: 'client', amount: 1300, dueDate: '2026-12-20', description: 'Mensalidade', status: 'pending', pixKey: 'pix-original' };
const put = (id, extra = {}) => db.doc(`invoices/${id}`).set({ ...base, ...extra });
const read = async id => (await db.doc(`invoices/${id}`).get()).data();
const manage = (input, uid = 'admin') => manageInvoices(db, uid, input, now);
const edit = (id, changes) => manage({ phase: 'apply', action: 'edit', invoiceId: id, changes });
const preview = (id, action, extra = {}) => manage({ phase: 'preview', action, invoiceId: id, ...extra });
const confirm = result => manage({ phase: 'confirm', previewId: result.previewId });
before(async () => { await db.doc('admins/admin').set({ active: true }); await db.doc('admins/inactive').set({ active: false }); await db.doc('brands/client').set({ accessEnabled: true }); });
after(async () => { await db.terminate(); await deleteApp(app); });

test('pagamento manual pelo fluxo real pode ser excluído com evidência arquivada', async () => {
  await put('manual-delete'); await confirmPayment(db, { uid: 'admin', authTime: 1 }, 'manual-delete');
  const paid = await read('manual-delete'); assert.equal(paid.status, 'paid'); assert.equal(paid.confirmedBy, 'admin');
  const p = await preview('manual-delete', 'delete'); assert.equal(p.removed, 1); await confirm(p);
  assert.equal(await read('manual-delete'), undefined);
  const archive = (await db.doc(`invoice_management_operations/${p.previewId}/deleted_invoices/manual-delete`).get()).data();
  assert.equal(archive.invoice.status, 'paid'); assert.equal(archive.invoice.confirmedBy, 'admin'); assert.equal(archive.deletedBy, 'admin');
  assert.ok(archive.history.some(item => item.action === 'payment_confirmed' && item.actorRole === 'admin'));
  assert.ok(archive.notifications.some(item => item.type === 'payment_confirmed'));
});
test('recorrência inteira inclui anteriores e futuras manuais; preserva pagamento externo e seus registros', async () => {
  for (let i = 0; i < 4; i++) await put(`whole-${i}`, { recurrenceGroupId: 'whole', dueDate: `2026-${String(i + 8).padStart(2, '0')}-20`, status: 'paid', confirmedBy: 'admin' });
  await db.doc('payments/whole-external').set({ invoiceId: 'whole-2', status: 'approved', providerStatus: 'approved' });
  await db.doc('payments/whole-external/attempts/one').set({ status: 'approved' });
  const p = await preview('whole-3', 'delete_all'); assert.equal(p.removed, 3); assert.equal(p.protected, 1);
  const result = await confirm(p); assert.equal(result.removed, 3); assert.equal(result.protected, 1);
  for (const id of ['whole-0', 'whole-1', 'whole-3']) assert.equal(await read(id), undefined);
  assert.ok(await read('whole-2')); assert.ok((await db.doc('payments/whole-external/attempts/one').get()).exists);
});
test('seleção e confirmação concorrentes excluem somente elegíveis originais e devolvem proteção nova', async () => {
  for (const id of ['race-a', 'race-b']) await put(id, { recurrenceGroupId: 'delete-race' });
  const p = await preview('race-a', 'delete_all'); assert.equal(p.removed, 2);
  await db.doc('payments/race-paid').set({ invoiceId: 'race-b', status: 'approved' });
  await put('race-new', { recurrenceGroupId: 'delete-race' });
  const result = await confirm(p); assert.equal(result.removed, 1); assert.equal(result.protected, 1);
  assert.deepEqual(result.protectedInvoices.map(item => item.id), ['race-b']);
  assert.equal(await read('race-a'), undefined); assert.ok(await read('race-b')); assert.ok(await read('race-new'));
  assert.deepEqual(await confirm(p), result);
});
test('evidência externa na fatura, histórico ou notificações protege sem depender do status paid', async () => {
  for (const [id, extra] of [['origin', { confirmationSource: 'mercado_pago' }], ['settled', { settlementPaymentId: 'mercado_pago:123' }], ['provider', { provider: 'mercado_pago' }]]) {
    await put(id, extra); assert.equal((await preview(id, 'delete')).protected, 1);
  }
  for (const action of ['payment_confirmed', 'refund', 'chargeback', 'dispute']) {
    const id = `evidence-${action}`; await put(id); await db.doc(`invoices/${id}/history/event`).set({ action, actorRole: 'system', actorUid: 'system:mercado-pago' });
    assert.equal((await preview(id, 'delete')).protected, 1);
  }
  await put('review-notice'); await db.doc('notifications/external-review').set({ entityId: 'review-notice', type: 'checkout_review' });
  assert.equal((await preview('review-notice', 'delete')).protected, 1);
});
test('edição conserva recálculo estrito e proteção de fatura manualmente paga', async () => {
  await put('edit-stale', { recurrenceGroupId: 'edit-stale' });
  const p = await preview('edit-stale', 'edit_series', { changes: { amount: 1400 } });
  await db.doc('invoices/edit-stale').update({ notes: 'Mudou' });
  await assert.rejects(confirm(p), { code: 'failed-precondition' }); assert.equal((await read('edit-stale')).amount, 1300);
});

test('Admin edita individualmente campos seguros, versiona, audita e preserva Pix', async () => {
  await put('individual'); await put('untouched');
  const changes = { description: 'Nova descrição', amount: 1500, dueDate: '2026-12-25', referenceMonth: '2026-12', notes: 'Observação' };
  const result = await edit('individual', changes); assert.equal(result.updated, 1);
  const actual = await read('individual'); for (const [key, value] of Object.entries(changes)) assert.equal(actual[key], value);
  assert.equal(actual.pixKey, base.pixKey); assert.equal(actual.invoiceVersion, checkoutInvoiceVersion(actual)); assert.notEqual(actual.invoiceVersion, checkoutInvoiceVersion(base)); assert.equal((await read('untouched')).amount, 1300);
  const history = await db.collection('invoices/individual/history').get(); assert.equal(history.size, 1); assert.equal(history.docs[0].data().actorUid, 'admin');
});
test('sem autenticação, cliente, equipe e Admin inativo não editam nem excluem', async () => {
  await put('authorization');
  for (const uid of ['', 'client', 'team', 'inactive']) for (const action of ['edit', 'delete_series']) await assert.rejects(manage({ phase: 'preview', action, invoiceId: 'authorization', changes: { amount: 1 } }, uid), { code: uid ? 'permission-denied' : 'unauthenticated' });
  assert.deepEqual(await read('authorization'), base);
});
test('entrada inválida, campos de ownership e destruição sem prévia são rejeitados', async () => {
  await put('invalid');
  for (const changes of [{ amount: 0 }, { dueDate: '2027-02-29' }, { brandId: 'other' }, { invoiceVersion: 'forged' }]) await assert.rejects(edit('invalid', changes));
  await assert.rejects(manage({ phase: 'apply', action: 'delete', invoiceId: 'invalid' }), { code: 'failed-precondition' }); assert.ok(await read('invalid'));
  await assert.rejects(manage({ phase: 'apply', action: 'transition', invoiceId: 'invalid', status: 'cancelled', changes: { amount: 1 } }), { code: 'invalid-argument' });
});
test('pagas e informadas preservadas; observação individual não altera evidência financeira', async () => {
  for (const status of ['paid', 'payment_reported']) {
    await put(status, { status }); await assert.rejects(edit(status, { amount: 1 }), { code: 'failed-precondition' });
    await edit(status, { notes: 'Conferida' }); assert.equal((await read(status)).amount, 1300); assert.equal((await read(status)).status, status);
  }
});
test('qualquer pagamento externo/tentativa/lock impede edição financeira e exclusão', async () => {
  for (const status of ['ready', 'pending', 'unknown', 'failed', 'approved']) {
    const id = `external-${status}`; await put(id); await db.doc(`payments/${id}`).set({ invoiceId: id, status, providerStatus: status });
    await assert.rejects(edit(id, { dueDate: '2027-01-01' }), { code: 'failed-precondition' }); const p = await preview(id, 'delete'); assert.equal(p.protected, 1); await confirm(p); assert.ok(await read(id));
  }
  await put('locked'); await db.doc('invoice_checkout_locks/locked').set({ status: 'creating' }); await assert.rejects(edit('locked', { amount: 1 }), { code: 'failed-precondition' });
});
test('exclusão remove apenas cobrança equivocada e registros benignos; auditoria resumida permanece', async () => {
  await put('mistake'); await db.doc('invoices/mistake/history/created').set({ action: 'created' }); await db.doc('notifications/mistake-created').set({ entityId: 'mistake', type: 'invoice_created' });
  const p = await preview('mistake', 'delete'); assert.equal(p.removed, 1); assert.ok(await read('mistake')); await confirm(p);
  assert.equal(await read('mistake'), undefined); assert.equal((await db.collection('invoices/mistake/history').get()).size, 0); assert.equal((await db.doc('notifications/mistake-created').get()).exists, false);
  assert.equal((await db.doc(`invoice_management_operations/${p.previewId}`).get()).data().status, 'confirmed'); assert.deepEqual(await confirm(p), (await db.doc(`invoice_management_operations/${p.previewId}`).get()).data().result);
});
test('histórico administrativo, lembrete e boleto não impedem remoção sem vínculo externo', async () => {
  await put('history'); await db.doc('invoices/history/history/h').set({ action: 'payment_confirmed' });
  await put('notice'); await db.doc('notifications/reminder').set({ entityId: 'notice', type: 'invoice_overdue' });
  await put('boleto', { boletoMediaId: 'media' });
  for (const id of ['history', 'notice', 'boleto']) { const p = await preview(id, 'delete'); assert.equal(p.removed, 1); await confirm(p); assert.equal(await read(id), undefined); assert.ok((await db.doc('invoice_management_operations/' + p.previewId + '/deleted_invoices/' + id).get()).exists); }
});
test('confirmar recalcula: novo vínculo externo protege; status manual e lembrete não bloqueiam', async () => {
  for (const association of ['paid', 'external', 'history']) {
    const id = `stale-${association}`; await put(id); const p = await preview(id, 'delete');
    if (association === 'paid') await db.doc(`invoices/${id}`).update({ status: 'paid' });
    if (association === 'external') await db.doc(`payments/${id}`).set({ invoiceId: id, status: 'ready' });
    if (association === 'history') await db.doc(`invoices/${id}/history/new`).set({ action: 'reminder_sent' });
    const result = await confirm(p); assert.equal(result.removed, association === 'external' ? 0 : 1); assert.equal(result.protected, association === 'external' ? 1 : 0); assert.equal(Boolean(await read(id)), association === 'external');
  }
});
test('prévia expira e pertence ao Admin que a criou; payload de confirmação não muda comando', async () => {
  await put('owned'); const p = await preview('owned', 'delete'); await db.doc('admins/second').set({ active: true });
  await assert.rejects(manage({ phase: 'confirm', previewId: p.previewId }, 'second'), { code: 'permission-denied' });
  await assert.rejects(manageInvoices(db, 'admin', { phase: 'confirm', previewId: p.previewId }, new Date(now.getTime() + 600001)), { code: 'failed-precondition' });
  await manage({ phase: 'confirm', previewId: p.previewId, invoiceId: 'untouched', action: 'delete' }); assert.ok(await read('untouched')); assert.equal(await read('owned'), undefined);
});
test('esta e próximas modifica apenas mesma série elegível; anteriores e pagas intactas', async () => {
  for (const [id, dueDate, status] of [['prior', '2026-10-20', 'pending'], ['anchor', '2026-12-20', 'pending'], ['next', '2027-01-20', 'pending'], ['protected-next', '2027-02-20', 'paid']]) await put(id, { recurrenceGroupId: 'edit-series', dueDate, status });
  await put('other-series', { recurrenceGroupId: 'other' });
  const p = await preview('anchor', 'edit_series', { changes: { amount: 1500, description: 'Nova', notes: 'Nota' }, day: 25 }); assert.equal(p.updated, 2); assert.equal(p.protected, 1); await confirm(p);
  assert.equal((await read('prior')).amount, 1300); assert.equal((await read('protected-next')).amount, 1300); assert.equal((await read('other-series')).amount, 1300);
  assert.equal((await read('anchor')).dueDate, '2026-12-25'); assert.equal((await read('next')).dueDate, '2027-01-25'); assert.equal((await read('next')).notes, 'Nota');
});
for (const day of [29, 30, 31]) test(`dia ${day} respeita fevereiro comum e bissexto`, async () => {
  const group = `clamp-${day}`; await put(`${group}-a`, { recurrenceGroupId: group, dueDate: '2027-02-20' }); await put(`${group}-b`, { recurrenceGroupId: group, dueDate: '2028-02-20' });
  await confirm(await preview(`${group}-a`, 'edit_series', { day })); assert.equal((await read(`${group}-a`)).dueDate, '2027-02-28'); assert.equal((await read(`${group}-b`)).dueDate, '2028-02-29');
});
test('encurtar série preserva protegidas; novo dia é considerado no corte', async () => {
  for (const [id, dueDate, status] of [['short-a', '2026-12-20', 'pending'], ['short-b', '2027-01-20', 'pending'], ['short-paid', '2027-02-20', 'paid']]) await put(id, { recurrenceGroupId: 'short', dueDate, status });
  const p = await preview('short-a', 'edit_series', { day: 25, endDate: '2026-12-25' }); assert.equal(p.removed, 1); assert.equal(p.protected, 1); await confirm(p); assert.equal(await read('short-b'), undefined); assert.ok(await read('short-paid')); assert.equal((await read('short-a')).recurrenceEnd, '2026-12');
  await put('cut-day', { recurrenceGroupId: 'cut-day' }); const cut = await preview('cut-day', 'edit_series', { day: 25, endDate: '2026-12-20' }); assert.equal(cut.removed, 1);
});
test('limpa série errada desde 2024: 32 removíveis, seis preservadas, duas protegidas', async () => {
  const batch = db.batch(); for (let i = 0; i < 38; i++) { const d = new Date(Date.UTC(2024, i, 20)).toISOString().slice(0, 10); batch.set(db.doc(`invoices/old-${i}`), { ...base, dueDate: d, recurrenceGroupId: 'old', status: 'paid', confirmedBy: 'admin', ...(i < 2 ? { confirmationSource: 'mercado_pago', settlementPaymentId: 'mercado_pago:' + i } : {}) }); } await batch.commit();
  const p = await preview('old-37', 'delete_before', { before: '2026-11-01' }); assert.equal(p.removed, 32); assert.equal(p.preserved, 6); assert.equal(p.protected, 2); assert.ok(await read('old-2')); await confirm(p);
  assert.equal((await db.collection('invoices').where('recurrenceGroupId', '==', 'old').get()).size, 6); assert.ok(await read('old-0')); assert.ok(await read('old-34')); assert.equal(await read('old-2'), undefined);
});
test('excluir esta e próximas preserva anteriores e outro grupo', async () => {
  for (let i = 0; i < 3; i++) await put(`del-${i}`, { recurrenceGroupId: 'del', dueDate: `2026-${10 + i}-20` });
  const p = await preview('del-1', 'delete_series'); assert.equal(p.removed, 2); await confirm(p); assert.ok(await read('del-0')); assert.equal(await read('del-1'), undefined); assert.equal(await read('del-2'), undefined); assert.ok(await read('other-series'));
});
test('limite de série e ownership divergente falham sem aplicação parcial', async () => {
  const batch = db.batch(); for (let i = 0; i < 61; i++) batch.set(db.doc(`invoices/large-${i}`), { ...base, recurrenceGroupId: 'large' }); await batch.commit();
  await assert.rejects(preview('large-0', 'delete_series'), { code: 'failed-precondition' }); assert.equal((await db.collection('invoices').where('recurrenceGroupId', '==', 'large').get()).size, 61);
  await put('mixed-a', { recurrenceGroupId: 'mixed' }); await put('mixed-b', { recurrenceGroupId: 'mixed', brandId: 'other' }); await assert.rejects(preview('mixed-a', 'edit_series', { changes: { amount: 1 } }), { code: 'failed-precondition' });
});
test('edição usa versão nova no checkout; reserva existente bloqueia corrida de edição', async () => {
  await put('version'); await edit('version', { amount: 1500 }); let calls = 0;
  const provider = { async create(input) { calls++; assert.equal(input.amountCents, 150000); await assert.rejects(edit('version', { amount: 2000 }), { code: 'failed-precondition' }); return { providerOrderId: 'ORDversion', checkoutUrl: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=p' }; } };
  await createInvoiceCheckout(db, 'client', { invoiceId: 'version' }, provider); const payment = (await db.collection('payments').where('invoiceId', '==', 'version').get()).docs[0].data(); assert.equal(payment.invoiceVersion, checkoutInvoiceVersion(await read('version')));
  // Simulate an out-of-band privileged change to verify old checkout is never reused.
  await db.doc('invoices/version').update({ amount: 2000 }); await assert.rejects(createInvoiceCheckout(db, 'client', { invoiceId: 'version' }, provider), { code: 'failed-precondition' }); assert.equal(calls, 1);
});
test('cancelamento/suspensão continuam auditados, preservando dados', async () => {
  await put('transition'); await manage({ phase: 'apply', action: 'transition', invoiceId: 'transition', status: 'suspended' }); assert.ok((await read('transition')).suspendedAt);
  await manage({ phase: 'apply', action: 'transition', invoiceId: 'transition', status: 'pending' }); assert.equal((await read('transition')).suspendedAt, undefined);
  await manage({ phase: 'apply', action: 'transition', invoiceId: 'transition', status: 'cancelled' }); assert.ok((await read('transition')).cancelledAt); assert.equal((await db.collection('invoices/transition/history').get()).size, 3);
});
test('lembretes usam novo vencimento e ignoram pagas, canceladas e excluídas', async () => {
  await put('reminder-edit'); await edit('reminder-edit', { dueDate: '2026-12-25' });
  const stage = reminderStages.find(item => item.days === 0);
  assert.equal(await sendInvoiceReminder(db, 'reminder-edit', stage, '2026-12-20'), false);
  assert.equal(await sendInvoiceReminder(db, 'reminder-edit', stage, '2026-12-25'), true);
  for (const status of ['paid', 'cancelled']) { await put(`no-reminder-${status}`, { status }); assert.equal(await sendInvoiceReminder(db, `no-reminder-${status}`, stage, '2026-12-20'), false); }
  await put('no-reminder-deleted'); await confirm(await preview('no-reminder-deleted', 'delete')); assert.equal(await sendInvoiceReminder(db, 'no-reminder-deleted', stage, '2026-12-20'), false);
});
