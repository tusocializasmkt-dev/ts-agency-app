// Run without --apply first. Uses ADC; never writes or prints credentials.
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { operationalBrand, publicAgency } from '../lib/operational-projection.js';

const projectId = 'gen-lang-client-0975642231';
const config = JSON.parse(readFileSync(new URL('../../firebase-applet-config.json', import.meta.url), 'utf8'));
if (config.projectId !== projectId) throw new Error('Unexpected Firebase project.');
const apply = process.argv.includes('--apply');
if (apply && !process.argv.includes(`--project=${projectId}`)) throw new Error('Applying requires the explicit expected --project.');
const app = initializeApp({ projectId, storageBucket: config.storageBucket });
const db = getFirestore(app, config.firestoreDatabaseId);
const bucket = getStorage(app).bucket();
const brands = await db.collection('brands').get();
const agency = await db.collection('agency_config').get();
const media = await db.collection('media').get();
const categories = new Map(media.docs.map(item => [item.data().storagePath, item.data().category]));
for (const item of media.docs) if (apply) await db.runTransaction(async transaction => {
  const current = await transaction.get(item.ref);
  if (current.exists) transaction.update(item.ref, { teamVisible: ['feed', 'stories', 'reels', 'carousel', 'other'].includes(current.data().category) });
});
let storageCount = 0;
for (const brand of brands.docs) {
  if (apply) await db.runTransaction(async transaction => {
    const current = await transaction.get(brand.ref);
    if (current.exists) transaction.set(db.collection('team_brands').doc(brand.id), operationalBrand(current.data()));
  });
  const [files] = await bucket.getFiles({ prefix: `brands/${brand.id}/media/` });
  for (const file of files) {
    // Unknown files stay private until explicitly classified; logos are operational.
    const category = categories.get(file.name) ?? (file.name.startsWith(`brands/${brand.id}/media/logos/`) ? 'other' : 'invoice');
    storageCount++;
    if (apply) { const [metadata] = await file.getMetadata(); await file.setMetadata({ metadata: { ...metadata.metadata, category } }); }
  }
}
for (const document of agency.docs) if (apply) await db.runTransaction(async transaction => {
  const current = await transaction.get(document.ref);
  if (current.exists) transaction.set(db.collection('agency_public').doc(document.id), publicAgency(current.data()));
});
console.log(JSON.stringify({ mode: apply ? 'applied' : 'dry-run', projectId, brands: brands.size, agency: agency.size, storageObjects: storageCount }));
