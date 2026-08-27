import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { buildBrandShowcaseProjection } from '../lib/brand-showcase.js';

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
const [brands, existingShowcase] = await Promise.all([
  db.collection('brands').get(),
  db.collection('brand_showcase').get(),
]);
const existingById = new Map(existingShowcase.docs.map(snapshot => [snapshot.id, snapshot.data()]));

const planned = brands.docs.map(snapshot => ({
  id: snapshot.id,
  projection: buildBrandShowcaseProjection(snapshot.data()),
}));
const changed = planned.filter(({ id, projection }) => {
  const current = existingById.get(id);
  return !current
    || current.displayName !== projection.displayName
    || current.logoUrl !== projection.logoUrl
    || current.visible !== projection.visible;
});

console.log(`[brand-showcase] Brands found: ${brands.size}`);
console.log(`[brand-showcase] Existing showcase documents: ${existingShowcase.size}`);
console.log(`[brand-showcase] Documents that would be written: ${changed.length}`);
console.log(`[brand-showcase] Unchanged documents: ${planned.length - changed.length}`);

if (!apply) {
  console.log('[brand-showcase] DRY RUN complete. No writes were performed.');
  process.exit(0);
}

for (let offset = 0; offset < changed.length; offset += 400) {
  const batch = db.batch();
  for (const { id, projection } of changed.slice(offset, offset + 400)) {
    batch.set(db.collection('brand_showcase').doc(id), { ...projection, updatedAt: FieldValue.serverTimestamp() });
  }
  await batch.commit();
}
console.log(`[brand-showcase] APPLY complete. ${changed.length} brand_showcase document(s) written.`);
