import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { getApps } from 'firebase-admin/app';
import { HttpsError } from 'firebase-functions/v2/https';
import { manageUserAccess } from '../index.js';
import { mapAccessError } from '../access-errors.js';

test('callable allows browser preflight but rejects anonymous POST before Admin SDK initialization', async () => {
  const app = express();
  app.use(express.json());
  app.all('/manageUserAccess', (req, res) => {
    void manageUserAccess(req as Parameters<typeof manageUserAccess>[0], res);
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const url = `http://127.0.0.1:${address.port}/manageUserAccess`;
    const origin = 'https://ts-agency-app.vercel.app';
    const preflight = await fetch(url, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    const response = await fetch(url, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { kind: 'admin', action: 'create' } }) });
    assert.equal(response.status, 401);
    assert.equal((await response.json() as { error: { status: string } }).error.status, 'UNAUTHENTICATED');
    assert.equal(getApps().length, 0);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('known access failures keep distinct safe callable codes', () => {
  assert.equal(mapAccessError({ code: 'auth/email-already-exists' }).code, 'already-exists');
  for (const error of [{ code: 'auth/invalid-password' }, new Error('invalid-access-password')]) {
    assert.equal(mapAccessError(error).code, 'invalid-argument');
    assert.deepEqual(mapAccessError(error).details, { reason: 'invalid-password' });
  }
  for (const code of ['permission-denied', 'unauthenticated'] as const) assert.equal(mapAccessError(new HttpsError(code, 'safe')).code, code);
  assert.equal(mapAccessError(new Error('self-access-removal')).code, 'failed-precondition');
  const unexpected = mapAccessError(new Error('private backend details'));
  assert.equal(unexpected.code, 'internal');
  assert.ok(!unexpected.message.includes('private backend details'));
  assert.equal(unexpected.details, undefined);
});
