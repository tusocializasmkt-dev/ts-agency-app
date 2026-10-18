import { readFileSync } from 'node:fs';
import test, { before, after } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
let environment;
const surface = { color: '#ffffffff', image: '', position: 50, scale: 100, overlay: 85 };
const legacy = { name: 'Original', sidebar: surface, header: surface, accent: '#000000ff', dashboard: '#000000ff', feed: '#000000ff' };
const background = { image: 'https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0975642231.firebasestorage.app/o/agency%2Fappearance%2Ftest.png?alt=media', positionX: 20, positionY: 70, scale: 150, overlayColor: '#000000ff', overlay: 40 };
const theme = { ...legacy, sidebar: { ...surface, desktopBackground: background } };
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Somente emulador.');
  environment = await initializeTestEnvironment({ projectId: 'demo-desktop-sidebar', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
  await environment.withSecurityRulesDisabled(async context => {
    for (const [uid, active] of [['editor', true], ['admin', true], ['disabled', false]]) await setDoc(doc(context.firestore(), 'admins', uid), { active });
  });
});
after(async () => environment?.cleanup());
const claims = { admin: true, appearanceEditor: true };
test('combinações legadas e desktop são aceitas apenas para administrador autorizado', async () => {
  const db = environment.authenticatedContext('editor', claims).firestore();
  await assertSucceeds(setDoc(doc(db, 'appearance', 'active'), legacy));
  await assertSucceeds(setDoc(doc(db, 'appearance', 'active'), theme));
  await assertSucceeds(setDoc(doc(db, 'appearance_designs', 'desktop'), theme));
  for (const uid of ['admin', 'disabled', 'client']) await assertFails(setDoc(doc(environment.authenticatedContext(uid, uid === 'admin' ? { admin: true } : claims).firestore(), 'appearance', 'active'), theme));
  await assertFails(setDoc(doc(environment.unauthenticatedContext().firestore(), 'appearance', 'active'), theme));
});
test('novos campos rejeitam URLs temporárias, valores inválidos e configuração desktop no cabeçalho', async () => {
  const db = environment.authenticatedContext('editor', claims).firestore();
  for (const patch of [{ image: 'blob:temporary' }, { image: 'javascript:alert(1)' }, { positionX: -1 }, { positionY: 101 }, { scale: 300 }, { overlay: -1 }, { overlayColor: 'red' }, { unknown: true }]) await assertFails(setDoc(doc(db, 'appearance', 'active'), { ...legacy, sidebar: { ...surface, desktopBackground: { ...background, ...patch } } }));
  await assertFails(setDoc(doc(db, 'appearance', 'active'), { ...legacy, header: { ...surface, desktopBackground: background } }));
  await assertSucceeds(setDoc(doc(db, 'appearance', 'active'), { ...legacy, sidebar: { ...surface, desktopBackground: { ...background, image: '', overlay: 0 } } }));
});
