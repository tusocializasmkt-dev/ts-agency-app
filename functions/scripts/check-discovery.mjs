// Local SDK discovery only: no deployment, credentials, or function invocation.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const functionsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(functionsDir, 'package.json'));
const sdkBin = resolve(dirname(require.resolve('firebase-functions/v2/https')), '../../bin/firebase-functions.js');
const expected = ['syncOperationalBrand', 'syncPublicAgency', 'syncBrandShowcase', 'internalLogin', 'setInternalCredential', 'createClientAccess', 'createClientWithAccess', 'resetClientPassword', 'setClientAccessStatus', 'createTeamMember', 'updateTeamMember', 'resetTeamMemberPassword', 'manageUserAccess', 'marketingAssistant'];
const probe = createServer();
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const { port } = probe.address();
await new Promise(resolve => probe.close(resolve));
const started = performance.now();
const child = spawn(process.execPath, [sdkBin], {
  cwd: functionsDir,
  env: { ...process.env, PORT: String(port), FUNCTIONS_CONTROL_API: 'true', FUNCTIONS_MANIFEST_OUTPUT_PATH: '' },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let spawnError;
child.on('error', error => { spawnError = error; });
child.stdout.resume();
child.stderr.resume();
const closed = new Promise(resolve => child.on('close', resolve));
const timeout = AbortSignal.timeout(10_000);
try {
  let response;
  while (!response) {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null) throw new Error(`Discovery process exited: ${child.exitCode}`);
    timeout.throwIfAborted();
    try { response = await fetch(`http://127.0.0.1:${port}/__/functions.yaml`, { signal: timeout }); }
    catch (error) { if (timeout.aborted) throw error; await delay(50); }
  }
  assert.equal(response.status, 200, 'SDK discovery must return HTTP 200');
  const manifest = await response.json();
  assert.deepEqual(Object.keys(manifest.endpoints).sort(), expected.sort());
  assert.ok(!(manifest.params ?? []).some(param => param.type === 'secret'), 'Administrative discovery must not register global secret parameters');
  assert.deepEqual(manifest.endpoints.marketingAssistant.secretEnvironmentVariables, [{ key: 'OPENAI_API_KEY' }]);
  for (const [name, endpoint] of Object.entries(manifest.endpoints)) {
    if (name !== 'marketingAssistant') assert.equal(endpoint.secretEnvironmentVariables?.length ?? 0, 0, `${name} must not depend on the OpenAI secret`);
  }
  for (const [name, endpoint] of Object.entries(manifest.endpoints)) {
    if (endpoint.eventTrigger?.eventType.startsWith('google.cloud.firestore.')) {
      assert.equal(endpoint.eventTrigger.eventFilters.database, 'ai-studio-983a0c74-a073-4755-af2a-6e8c97248d58', `${name} must use the named database`);
    }
  }
  console.log(JSON.stringify({ discovery: 'passed', endpoints: expected.length, elapsedMs: Math.round(performance.now() - started), limitMs: 10_000 }));
} finally {
  child.kill();
  await closed;
}
