import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { rebuildBrandShowcase } from '../lib/brand-showcase-store.js';

const EXPECTED_PROJECT_ID = 'gen-lang-client-0975642231';
const FIRESTORE_DATABASE_ID = 'ai-studio-983a0c74-a073-4755-af2a-6e8c97248d58';
const APPLY_FLAG = '--apply';

function argumentValue(name) {
  const inline = process.argv.find(argument => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const apply = process.argv.includes(APPLY_FLAG);
const requestedProjectId = argumentValue('--project');
const confirmedProjectId = argumentValue('--confirm-project');

console.log(`[brand-showcase] Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
console.log(`[brand-showcase] Firebase project: ${EXPECTED_PROJECT_ID}`);
console.log(`[brand-showcase] Firestore database: ${FIRESTORE_DATABASE_ID}`);

if (requestedProjectId !== EXPECTED_PROJECT_ID) {
  console.error(`[brand-showcase] Refusing to continue. Pass --project=${EXPECTED_PROJECT_ID}.`);
  process.exit(1);
}

if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('[brand-showcase] Refusing to continue while FIRESTORE_EMULATOR_HOST is set.');
  process.exit(1);
}

if (apply && confirmedProjectId !== EXPECTED_PROJECT_ID) {
  console.error(`[brand-showcase] APPLY requires --confirm-project=${EXPECTED_PROJECT_ID}.`);
  process.exit(1);
}

const app = getApps()[0] ?? initializeApp({ credential: applicationDefault(), projectId: EXPECTED_PROJECT_ID });
const db = getFirestore(app, FIRESTORE_DATABASE_ID);
const result = await rebuildBrandShowcase(db, apply);
console.log(`[brand-showcase] Brands found: ${result.brands}`);
console.log(`[brand-showcase] Existing showcase documents: ${result.projections}`);
console.log(`[brand-showcase] Documents ${apply ? 'written' : 'to write'}: ${result.written}`);
console.log(`[brand-showcase] Orphans ${apply ? 'removed' : 'to remove'}: ${result.removed}`);
console.log(`[brand-showcase] Unchanged documents: ${result.unchanged}`);
console.log(`[brand-showcase] ${apply ? 'APPLY complete.' : 'DRY RUN complete. No writes were performed.'}`);
