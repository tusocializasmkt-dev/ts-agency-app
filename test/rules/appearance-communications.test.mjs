import { readFileSync } from 'node:fs';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
const requireFunctions = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = requireFunctions('firebase-admin/app');
const { getFirestore } = requireFunctions('firebase-admin/firestore');
let env, app, db;
const theme = { name: 'Teste', sidebar: { color: '#ffffffff', image: '', position: 50, scale: 100, overlay: 85 }, header: { color: '#000000ff', image: '', position: 50, scale: 100, overlay: 85 }, accent: '#123456ff', dashboard: '#000000ff', feed: '#ffffffff' };
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Somente emuladores.');
  env = await initializeTestEnvironment({ projectId: 'demo-ts-agency-appearance', firestore: { rules: readFileSync('firestore.rules', 'utf8') }, storage: { rules: readFileSync('storage.rules', 'utf8') } });
  app = initializeApp({ projectId: 'demo-ts-agency-appearance' }, 'communications-tests'); db = getFirestore(app);
  await env.withSecurityRulesDisabled(async context => {
    const f = context.firestore();
    for (const id of ['admin', 'editor', 'disabled']) await setDoc(doc(f, 'admins', id), { active: id !== 'disabled' });
    for (const id of ['client', 'other', 'blocked']) await setDoc(doc(f, 'brands', id), { status: 'active', accessEnabled: id !== 'blocked' });
    await setDoc(doc(f, 'team_members', 'team'), { active: true, role: 'manager', brandIds: ['client'] });
    await setDoc(doc(f, 'appearance', 'active'), theme);
    await setDoc(doc(f, 'notifications', 'popup'), { recipientUid: 'client', type: 'communication', popup: true, popupDismissedAt: null, readAt: null });
  });
});
after(async () => { await env?.cleanup(); if (app) await deleteApp(app); });
const claims = { admin: true, appearanceEditor: true, communicationsEditor: true };
test('aparência só é editável pelo administrador com permissão específica', async () => {
  for (const uid of ['admin', 'editor', 'client', 'team', 'disabled']) {
    const f = env.authenticatedContext(uid, uid === 'admin' ? { admin: true } : claims).firestore();
    if (uid === 'editor') await assertSucceeds(setDoc(doc(f, 'appearance', 'active'), theme));
    else await assertFails(setDoc(doc(f, 'appearance', 'active'), theme));
    if (uid !== 'disabled') await assertSucceeds(getDoc(doc(f, 'appearance', 'active')));
  }
  const editor = env.authenticatedContext('editor', claims).firestore();
  await assertFails(setDoc(doc(editor, 'appearance', 'active'), { ...theme, accent: 'red' }));
  await assertFails(setDoc(doc(editor, 'appearance', 'active'), { ...theme, header: { ...theme.header, image: 'javascript:alert(1)' } }));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'appearance', 'active')));
});
test('upload recusa SVG, arquivos grandes e falta de permissão', async () => {
  for (const uid of ['editor', 'admin']) {
    const storage = env.authenticatedContext(uid, uid === 'admin' ? { admin: true } : claims).storage();
    const object = ref(storage, `agency/appearance/${uid}.png`);
    if (uid === 'editor') await assertSucceeds(uploadBytes(object, new Uint8Array([1]), { contentType: 'image/png' }));
    else if (uid === 'admin') await assertFails(uploadBytes(object, new Uint8Array([1]), { contentType: 'image/png' }));
  }
  const storage = env.authenticatedContext('editor', claims).storage();
  await assertFails(uploadBytes(ref(storage, 'agency/communications/test.svg'), new Uint8Array([1]), { contentType: 'image/svg+xml' }));
  await assertFails(uploadBytes(ref(storage, 'agency/appearance/large.png'), new Uint8Array(2 * 1024 * 1024 + 1), { contentType: 'image/png' }));
  await assertFails(uploadBytes(ref(env.authenticatedContext('client').storage(), 'agency/appearance/denied.png'), new Uint8Array([1]), { contentType: 'image/png' }));
});
test('agendamento aguarda data, rascunho não envia e conflito de edição é recusado', async () => {
  const { manageCommunication, deliverPage, dispatchCommunications } = await import('../../functions/lib/communications.js');
  const payload = { id: 'schedule-test', title: 'Agendado', message: 'Conteúdo', image: '', popup: false, audience: 'all', recipients: [], action: 'schedule', scheduledAt: Date.now() + 3600000, revision: 0 };
  await manageCommunication(db, 'editor', payload);
  assert.equal(await deliverPage(db, payload.id), false);
  assert.equal((await db.doc('communications/schedule-test').get()).data().status, 'scheduled');
  await assert.rejects(manageCommunication(db, 'editor', { ...payload, title: 'Conflito', revision: 0 }));
  await db.doc('communications/schedule-test').update({ scheduledAt: new Date(Date.now() - 1000) });
  await dispatchCommunications(db);
  assert.equal((await db.doc('communications/schedule-test').get()).data().delivered, 2);
  await manageCommunication(db, 'editor', { ...payload, id: 'draft-test', action: 'draft' });
  assert.equal(await deliverPage(db, 'draft-test'), false);
});
test('logo sincroniza somente administrador ativo e preserva demais claims', async () => {
  const { prepareLogoAccess } = await import('../../functions/lib/agency-logo-access.js');
  let saved;
  const auth = { getUser: async uid => ({ uid, disabled: false, customClaims: { appearanceEditor: true } }), setCustomUserClaims: async (uid, claims) => { saved = { uid, claims }; } };
  for (const uid of [undefined, 'client', 'disabled']) await assert.rejects(prepareLogoAccess(db, auth, uid));
  assert.equal(saved, undefined);
  await prepareLogoAccess(db, auth, 'editor');
  assert.deepEqual(saved, { uid: 'editor', claims: { appearanceEditor: true, admin: true } });
  await assert.rejects(prepareLogoAccess(db, { ...auth, getUser: async () => ({ disabled: true }) }, 'editor'));
});
test('comunicados só são gravados pelo backend e dispensa só pelo destinatário', async () => {
  for (const uid of ['editor', 'client', 'other']) {
    const f = env.authenticatedContext(uid, claims).firestore();
    await assertFails(setDoc(doc(f, 'communications', 'forged'), { status: 'sent' }));
    if (uid !== 'client' && uid !== 'editor') await assertFails(getDoc(doc(f, 'notifications', 'popup')));
    await assertFails(updateDoc(doc(f, 'notifications', 'popup'), { title: 'Alterado', popupDismissedAt: serverTimestamp() }));
    if (uid !== 'client') await assertFails(updateDoc(doc(f, 'notifications', 'popup'), { popupDismissedAt: serverTimestamp() }));
  }
  await assertSucceeds(updateDoc(doc(env.authenticatedContext('client').firestore(), 'notifications', 'popup'), { popupDismissedAt: serverTimestamp() }));
});
test('backend valida permissão, retry concorrente, edição e envio idempotente', async () => {
  const { manageCommunication, deliverPage, deliveryId, assertEditor } = await import('../../functions/lib/communications.js');
  await assert.rejects(assertEditor(db, 'admin', { admin: true }));
  await assert.rejects(assertEditor(db, 'disabled', claims));
  await assertEditor(db, 'editor', claims);
  const payload = { id: 'delivery-test', title: 'Aviso', message: 'Conteúdo', image: '', popup: true, audience: 'selected', recipients: ['client', 'other', 'blocked'], action: 'send', scheduledAt: null, revision: 0 };
  await Promise.all([manageCommunication(db, 'editor', payload), manageCommunication(db, 'editor', payload)]);
  await Promise.all([deliverPage(db, payload.id), deliverPage(db, payload.id)]);
  assert.equal((await db.doc('communications/delivery-test').get()).data().delivered, 2);
  assert.equal((await db.doc('notifications/' + deliveryId(payload.id, 'blocked')).get()).exists, false);
  const n = db.doc('notifications/' + deliveryId(payload.id, 'client'));
  await n.update({ popupDismissedAt: new Date() }); await deliverPage(db, payload.id);
  assert.ok((await n.get()).data().popupDismissedAt);
  await assert.rejects(manageCommunication(db, 'editor', { ...payload, title: 'Mudar', revision: 1 }));
  const other = env.authenticatedContext('other').firestore();
  await assertFails(getDoc(doc(other, 'notifications', deliveryId(payload.id, 'client'))));
  await assertSucceeds(getDoc(doc(env.authenticatedContext('client').firestore(), 'notifications', deliveryId(payload.id, 'client'))));
});
