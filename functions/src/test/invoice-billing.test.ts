import assert from 'node:assert/strict';
import test from 'node:test';
import type { Auth } from 'firebase-admin/auth';
import { authenticatedBillingActor, billingDate, dueDateForStage, invoiceIdFrom } from '../invoice-billing.js';

test('billing uses São Paulo calendar boundaries and leap/month transitions', () => {
  assert.equal(billingDate(new Date('2026-09-24T02:59:59Z')), '2026-09-23');
  assert.equal(billingDate(new Date('2026-09-24T03:00:00Z')), '2026-09-24');
  assert.equal(dueDateForStage('2028-03-01', 1), '2028-02-29');
  assert.equal(dueDateForStage('2026-12-30', -3), '2027-01-02');
});
test('billing accepts only a single invoice ID, never caller role/brand/amount', () => {
  for (const data of [null, {}, { invoiceId: 'a/b' }, { invoiceId: '' }, { invoiceId: 1 }]) assert.throws(() => invoiceIdFrom(data), { code: 'invalid-argument' });
  assert.equal(invoiceIdFrom({ invoiceId: 'invoice', role: 'admin', amount: 0, brandId: 'other' }), 'invoice');
});
test('billing rejects unauthenticated, disabled and revoked sessions', async () => {
  const auth = (disabled: boolean, validAfter = '2026-09-01T00:00:00Z') => ({ getUser: async () => ({ disabled, tokensValidAfterTime: validAfter }) }) as unknown as Auth;
  const identity = { uid: 'client', token: { auth_time: Date.parse('2026-09-10T00:00:00Z') / 1000 } };
  await assert.rejects(authenticatedBillingActor(auth(false)), { code: 'unauthenticated' });
  await assert.rejects(authenticatedBillingActor(auth(true), identity), { code: 'unauthenticated' });
  await assert.rejects(authenticatedBillingActor(auth(false, '2026-09-11T00:00:00Z'), identity), { code: 'unauthenticated' });
  await assert.rejects(authenticatedBillingActor(auth(false), { uid: 'client', token: {} }), { code: 'unauthenticated' });
  assert.equal((await authenticatedBillingActor(auth(false), identity)).uid, 'client');
});
