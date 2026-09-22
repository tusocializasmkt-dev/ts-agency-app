import { afterAll, beforeEach, expect, it, vi } from 'vitest';
import { deleteApp } from 'firebase/app';
import * as firebaseApp from 'firebase/app';
import { callManageAccess } from '../data/functions/access.functions';
import { app } from '../lib/firebase';

// Test-only SDK seam: replace the Auth token source, keeping the real callable transport.
// This runtime export is intentionally omitted from Firebase's public declarations.
const { _getProvider } = firebaseApp as typeof firebaseApp & {
  _getProvider(app: typeof import('../lib/firebase').app, name: 'auth-internal'): {
    getImmediate(): { getToken(): Promise<{ accessToken: string } | null> };
  };
};

vi.mock('../lib/firebase', async () => {
  const { initializeApp } = await import('firebase/app');
  const { initializeAuth, inMemoryPersistence } = await import('firebase/auth');
  const app = initializeApp({ projectId: 'demo-access-test', apiKey: 'fake-key' }, 'access-callable-test');
  const auth = initializeAuth(app, { persistence: inMemoryPersistence });
  return { app, auth, usingFirebaseEmulators: false };
});

const request = vi.fn();
beforeEach(() => {
  vi.restoreAllMocks();
  request.mockReset();
  vi.stubGlobal('fetch', request);
});
afterAll(() => deleteApp(app));

it('real callable SDK sends Firebase ID token on POST to the configured region', async () => {
  const authInternal = _getProvider(app, 'auth-internal').getImmediate();
  vi.spyOn(authInternal, 'getToken').mockResolvedValue({ accessToken: 'test-only-token' });
  request.mockResolvedValue({ status: 200, json: async () => ({ data: { profiles: [] } }) });
  await expect(callManageAccess({ kind: 'admin', action: 'list' })).resolves.toEqual({ profiles: [] });
  expect(request).toHaveBeenCalledWith('https://southamerica-east1-demo-access-test.cloudfunctions.net/manageUserAccess', expect.objectContaining({
    method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer test-only-token' }),
    body: JSON.stringify({ data: { kind: 'admin', action: 'list' } }),
  }));
});

it('callable SDK preserves unauthenticated error when no Firebase session exists', async () => {
  vi.spyOn(_getProvider(app, 'auth-internal').getImmediate(), 'getToken').mockResolvedValue(null);
  request.mockResolvedValue({ status: 401, json: async () => ({ error: { status: 'UNAUTHENTICATED', message: 'Login required' } }) });
  await expect(callManageAccess({ kind: 'admin', action: 'list' })).rejects.toMatchObject({ code: 'functions/unauthenticated' });
  expect(request.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
});
