import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { tsImport } from 'tsx/esm/api';
const { mapPost, toPostWriteData } = await tsImport('../../src/data/mappers/post.mapper.ts', import.meta.url);
let environment;
before(async () => {
  environment = await initializeTestEnvironment({ projectId: 'demo-ts-publication', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
  await environment.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'admins/admin'), { active: true });
    await setDoc(doc(db, 'brands/client'), { accessEnabled: true });
    for (const [uid, role, active, brandIds] of [['manager', 'manager', true, ['client']], ['social', 'social_media', true, ['client']], ['outside', 'social_media', true, []], ['inactive', 'manager', false, ['client']]]) {
      await setDoc(doc(db, 'team_members', uid), { role, active, brandIds });
    }
    for (const id of ['admin', 'manager', 'social', 'client', 'outside', 'inactive', 'pending', 'tamper', 'approval']) {
      await setDoc(doc(db, 'posts', id), { brandId: 'client', type: 'feed', status: ['pending', 'approval'].includes(id) ? 'pending' : 'approved', scheduledDate: '2026-10-17', caption: 'Preservar', mediaIds: ['media'] });
    }
  });
});
after(async () => environment?.cleanup());
const publication = uid => ({ published: true, publishedBy: uid, publishedAt: serverTimestamp(), updatedAt: serverTimestamp() });
test('edição de data reproduz payload negado e preserva publicação com o mapper corrigido', async () => {
  for (const uid of ['admin', 'manager', 'social']) {
    for (const published of [undefined, false, true]) {
      const id = `date-${uid}-${String(published)}`;
      const original = { brandId: 'client', type: 'carousel', socialNetwork: 'instagram', status: 'pending',
        scheduledDate: '2026-10-21T17:00:00.000Z', caption: 'Legenda original',
        mediaIds: ['m2', 'm1'], coverMediaId: 'm1', mediaUrls: ['https://example.test/legacy.png'],
        objective: 'venda', createdAt: 'preservar' };
      if (published !== undefined) original.published = published;
      if (published) { original.status = 'approved'; original.publishedBy = 'admin'; original.publishedAt = 'preservar'; }
      await environment.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'posts', id), original));
      const reference = doc(environment.authenticatedContext(uid).firestore(), 'posts', id);
      const mapped = mapPost(await getDoc(reference));
      const scheduledDate = '2026-10-28T17:00:00.000Z'; // 14h em São Paulo
      const oldPayload = Object.fromEntries(Object.entries({ ...mapped, scheduledDate }).filter(([key, value]) => key !== 'id' && value !== undefined));
      if (published === undefined) await assertFails(updateDoc(reference, { ...oldPayload, updatedAt: serverTimestamp() }));
      await assertSucceeds(updateDoc(reference, { ...toPostWriteData({ ...mapped, scheduledDate }), updatedAt: serverTimestamp() }));
      const saved = (await getDoc(reference)).data();
      const { updatedAt, ...content } = saved;
      assert.deepStrictEqual(content, { ...original, scheduledDate });
    }
  }
});
test('somente admin e equipe ativa da marca marcam e desmarcam', async () => {
  for (const uid of ['admin', 'manager', 'social', 'client', 'outside', 'inactive']) {
    const reference = doc(environment.authenticatedContext(uid).firestore(), 'posts', uid);
    if (['admin', 'manager', 'social'].includes(uid)) {
      await assertSucceeds(updateDoc(reference, publication(uid)));
      await assertSucceeds(updateDoc(reference, { published: false, publishedAt: deleteField(), publishedBy: deleteField(), updatedAt: serverTimestamp() }));
    } else {
      await assertFails(updateDoc(reference, publication(uid)));
      await assertFails(updateDoc(reference, { published: false }));
    }
  }
});
test('bloqueia pendentes, autor falso e alterações de conteúdo na ação', async () => {
  const db = environment.authenticatedContext('admin').firestore();
  await assertFails(updateDoc(doc(db, 'posts/pending'), publication('admin')));
  await assertFails(updateDoc(doc(db, 'posts/tamper'), publication('other')));
  await assertFails(updateDoc(doc(db, 'posts/tamper'), { ...publication('admin'), caption: 'Alterada' }));
  await assertFails(updateDoc(doc(db, 'posts/tamper'), { ...publication('admin'), status: 'rejected' }));
});
test('cliente aprova com data real mas não pode falsificar a data', async () => {
  const reference = doc(environment.authenticatedContext('client').firestore(), 'posts/approval');
  await assertFails(updateDoc(reference, { status: 'approved', feedback: '', approvedAt: 'ontem' }));
  await assertSucceeds(updateDoc(reference, { status: 'approved', feedback: '', approvedAt: serverTimestamp(), updatedAt: serverTimestamp() }));
});

test('leitura direta de post publicado mantém isolamento por marca', async () => {
  await environment.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'posts/posted-read'), {
    brandId: 'client', status: 'approved', published: true, caption: 'Original', mediaIds: ['media'],
  }));
  for (const uid of ['admin', 'manager', 'social', 'client']) {
    await assertSucceeds(getDoc(doc(environment.authenticatedContext(uid).firestore(), 'posts/posted-read')));
  }
  for (const uid of ['outside', 'inactive', 'another-client']) {
    await assertFails(getDoc(doc(environment.authenticatedContext(uid).firestore(), 'posts/posted-read')));
  }
  await assertFails(getDoc(doc(environment.unauthenticatedContext().firestore(), 'posts/posted-read')));
});
