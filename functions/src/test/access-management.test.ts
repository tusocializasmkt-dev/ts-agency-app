import assert from 'node:assert/strict';
import test from 'node:test';
import { manageAccess, type AccessManagementDependencies } from '../access-management.js';
import { operationalBrand, publicAgency } from '../operational-projection.js';

function setup() {
  const calls: string[] = []; const writes: unknown[] = [];
  const deps: AccessManagementDependencies = {
    authorize: async actor => { if (actor !== 'admin') throw new Error('permission-denied'); },
    listAdmins: async () => [],
    profile: async (_kind, uid) => ({ uid, exists: true, active: false, email: 'test@example.test', displayName: 'Test' }),
    createAdmin: async () => { calls.push('create'); return 'new'; },
    updateAuth: async (_uid, data) => { calls.push('auth'); writes.push(data); },
    writeProfile: async (_kind, _uid, data) => { calls.push('profile'); writes.push(data); },
    block: async () => { calls.push('block'); },
    removeAuth: async () => { calls.push('removeAuth'); },
    removeProfile: async kind => { calls.push(`removeProfile:${kind}`); },
    revoke: async () => { calls.push('revoke'); }, claims: async () => { calls.push('claims'); },
  };
  return { deps, calls, writes };
}
test('all administrative actions deny client/team/anonymous before touching data', async () => {
  for (const actor of ['', 'client', 'manager', 'social_media']) for (const action of ['list','get','create','update','password','status','remove'] as const) {
    const { deps, calls } = setup(); await assert.rejects(manageAccess(actor, { kind: 'admin', action, uid: 'target' }, deps), /permission-denied/); assert.deepEqual(calls, []);
  }
});
test('cannot deactivate or remove own administrator account', async () => {
  for (const action of ['remove', 'status'] as const) { const { deps, calls } = setup(); await assert.rejects(manageAccess('admin', { kind: 'admin', action, uid: 'admin', active: false }, deps), /self-access-removal/); assert.deepEqual(calls, []); }
});
test('client removal blocks first, revokes, removes only login; no brand deletion operation exists', async () => {
  const { deps, calls } = setup(); await manageAccess('admin', { kind: 'client', action: 'remove', uid: 'brand' }, deps);
  assert.deepEqual(calls, ['block', 'auth', 'claims', 'revoke', 'removeAuth', 'removeProfile:client']);
});
test('password reset never activates a disabled account or persists the password in profile', async () => {
  const { deps, calls, writes } = setup(); await manageAccess('admin', { kind: 'client', action: 'password', uid: 'brand', password: 'example-only-123' }, deps);
  assert.deepEqual(calls, ['auth', 'revoke']); assert.deepEqual(writes, [{ password: 'example-only-123' }]);
});
test('invalid commands and passwords are rejected before mutations', async () => {
  const { deps, calls } = setup(); await assert.rejects(manageAccess('admin', { kind: 'admin', action: 'create', email: 'bad', displayName: 'Name', password: 'short' }, deps)); assert.deepEqual(calls, []);
});
test('activation and editing use only allowed fields', async () => {
  const { deps, writes } = setup(); await manageAccess('admin', { kind: 'client', action: 'update', uid: 'brand', email: ' USER@EXAMPLE.TEST ', displayName: ' Name ' }, deps);
  assert.deepEqual(writes, [{ email: 'user@example.test', displayName: 'Name' }, { login: 'user@example.test', accessDisplayName: 'Name' }]);
});
test('failed blocking never reaches Auth; partial removal stays blocked', async () => {
  const { deps, calls } = setup(); deps.block = async () => { throw new Error('last-active-admin'); };
  await assert.rejects(manageAccess('admin', { kind: 'admin', action: 'remove', uid: 'other' }, deps)); assert.deepEqual(calls, []);
});
test('operational projections exclude current and future billing fields', () => {
  const source = { name: 'Brand', email: 'contact@example.test', contractUrl: 'private', internalNotes: 'private', monthlyFee: 100, invoices: ['private'], pixKey: 'private', bankAccount: 'private', password: 'never' };
  assert.deepEqual(operationalBrand(source), { name: 'Brand', email: 'contact@example.test' });
  assert.deepEqual(publicAgency(source), { name: 'Brand', email: 'contact@example.test' });
});

test('admin can create another admin and activate client login without changing commercial status', async () => {
  const { deps, calls, writes } = setup();
  assert.deepEqual(await manageAccess('admin', { kind: 'admin', action: 'create', email: 'new@example.test', displayName: 'New Admin', password: 'example-only-123' }, deps), { uid: 'new' });
  await manageAccess('admin', { kind: 'client', action: 'status', uid: 'brand', active: true }, deps);
  assert.deepEqual(calls, ['create', 'auth', 'claims', 'profile']);
  assert.deepEqual(writes, [{ disabled: false }, { accessEnabled: true }]);
});

test('malformed payload is rejected without mutation', async () => {
  const { deps, calls } = setup();
  await assert.rejects(manageAccess('admin', null as never, deps), /invalid-access-command/);
  await assert.rejects(manageAccess('admin', { kind: 'admin', action: 'create', email: 42 as never }, deps), /invalid-access-command/);
  assert.deepEqual(calls, []);
});
