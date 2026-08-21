import test from 'node:test';
import assert from 'node:assert/strict';
import { assertAdminAccess, createClientAccess, createClientWithAccess, resetClientPassword, setClientAccessStatus, type ClientAccessDependencies } from '../user-access.js';

const calls = { users: [] as Array<Record<string, unknown>>, passwords: [] as Array<[string, string]>, disabled: [] as Array<[string, boolean]>, revoked: [] as string[], brands: [] as Array<[string, Record<string, unknown>]> };
const dependencies = (exists = true): ClientAccessDependencies => ({
  brandExists: async () => exists,
  createUser: async data => { calls.users.push(data); },
  updatePassword: async (uid, password) => { calls.passwords.push([uid, password]); },
  updateDisabled: async (uid, disabled) => { calls.disabled.push([uid, disabled]); },
  revokeRefreshTokens: async uid => { calls.revoked.push(uid); },
  updateBrand: async (id, data) => { calls.brands.push([id, data]); },
});

test.beforeEach(() => Object.values(calls).forEach(value => value.splice(0)));
test('cria usuário Firebase com UID igual ao ID da Brand e sem persistir senha', async () => {
  const result = await createClientAccess({ brandId: ' brand-a ', email: ' CLIENTE@EXEMPLO.COM ', password: 'senha123', active: true }, dependencies());
  assert.deepEqual(result, { uid: 'brand-a', email: 'cliente@exemplo.com', active: true });
  assert.deepEqual(calls.users[0], { uid: 'brand-a', email: 'cliente@exemplo.com', password: 'senha123', disabled: false });
  assert.equal('password' in calls.brands[0][1], false);
});
test('recusa criação sem Brand correspondente', async () => { await assert.rejects(createClientAccess({ brandId: 'ausente', email: 'a@b.com', password: 'senha123', active: true }, dependencies(false)), /brand-not-found/); });
test('redefine senha somente pelo Admin SDK', async () => { await resetClientPassword('brand-a', 'nova123', dependencies()); assert.deepEqual(calls.passwords, [['brand-a', 'nova123']]); assert.equal(calls.brands.length, 0); });
test('suspensão desabilita usuário, revoga tokens e atualiza Brand', async () => { await setClientAccessStatus('brand-a', false, dependencies()); assert.deepEqual(calls.disabled, [['brand-a', true]]); assert.deepEqual(calls.revoked, ['brand-a']); assert.equal(calls.brands[0][1].status, 'suspended'); });
test('reativação habilita usuário sem revogar token', async () => { await setClientAccessStatus('brand-a', true, dependencies()); assert.deepEqual(calls.disabled, [['brand-a', false]]); assert.deepEqual(calls.revoked, []); });
test('cliente autenticado não passa pela autorização administrativa', async () => { await assert.rejects(assertAdminAccess('brand-a', async () => false), /permission-denied/); });
test('administrador autenticado passa pela autorização administrativa', async () => { await assert.doesNotReject(assertAdminAccess('admin-a', async uid => uid === 'admin-a')); });
test('cadastro combinado usa UID da Brand e não persiste senha', async () => { const brands: Array<Record<string, unknown>> = []; await createClientWithAccess('brand-new', { brandId: 'brand-new', email: 'CLIENTE@EXEMPLO.COM', password: 'senha123', active: true, brand: { name: 'Cliente' } }, { createUser: async data => { calls.users.push(data); }, createBrand: async (uid, data) => { assert.equal(uid, 'brand-new'); brands.push(data); }, deleteUser: async () => {} }); assert.equal(calls.users[0].uid, 'brand-new'); assert.equal(brands[0].email, 'cliente@exemplo.com'); assert.equal('password' in brands[0], false); });
test('falha ao gravar Brand remove usuário Auth compensatoriamente', async () => { const deleted: string[] = []; await assert.rejects(createClientWithAccess('brand-new', { brandId: 'brand-new', email: 'c@e.com', password: 'senha123', active: true, brand: { name: 'Cliente' } }, { createUser: async () => {}, createBrand: async () => { throw new Error('firestore-failed'); }, deleteUser: async uid => { deleted.push(uid); } }), /firestore-failed/); assert.deepEqual(deleted, ['brand-new']); });
