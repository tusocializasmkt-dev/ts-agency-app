import assert from 'node:assert/strict';
import test from 'node:test';
import { buildBrandShowcaseProjection, synchronizeBrandShowcase } from '../brand-showcase.js';

test('todos os status e acesso desativado continuam visíveis por padrão', () => {
  for (const status of ['active', 'warning', 'delinquent', 'suspended', 'banning']) {
    assert.equal(buildBrandShowcaseProjection({ name: 'Marca', status, accessEnabled: false }).visible, true);
  }
});

test('visibilidade ausente é true e false é respeitado', () => {
  assert.equal(buildBrandShowcaseProjection({ name: 'Antiga' }).visible, true);
  assert.equal(buildBrandShowcaseProjection({ name: 'Oculta', showcaseVisible: false }).visible, false);
  assert.equal(buildBrandShowcaseProjection({ name: 'Reexibida', showcaseVisible: true }).visible, true);
});

test('nome fantasia, nome principal e logo são sanitizados e sincronizados', () => {
  assert.deepEqual(buildBrandShowcaseProjection({ name: 'Razão', tradeName: ' Pública ', logoUrl: ' https://logo.test/a.png ' }), { displayName: 'Pública', logoUrl: 'https://logo.test/a.png', visible: true });
  assert.deepEqual(buildBrandShowcaseProjection({ name: ' Principal ', logoUrl: '' }), { displayName: 'Principal', visible: true });
});

test('sincronização cria, atualiza e remove somente a projeção', async () => {
  const calls: unknown[] = [];
  const writer = { upsert: async (id: string, value: unknown) => { calls.push(['upsert', id, value]); }, remove: async (id: string) => { calls.push(['remove', id]); } };
  await synchronizeBrandShowcase('b1', { name: 'Nova', logoUrl: 'logo-1' }, writer);
  await synchronizeBrandShowcase('b1', { name: 'Novo nome', logoUrl: 'logo-2', showcaseVisible: false }, writer);
  await synchronizeBrandShowcase('b1', null, writer);
  assert.deepEqual(calls, [
    ['upsert', 'b1', { displayName: 'Nova', logoUrl: 'logo-1', visible: true }],
    ['upsert', 'b1', { displayName: 'Novo nome', logoUrl: 'logo-2', visible: false }],
    ['remove', 'b1'],
  ]);
});
