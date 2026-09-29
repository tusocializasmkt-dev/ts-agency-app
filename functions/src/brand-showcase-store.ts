import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { buildBrandShowcaseProjection } from './brand-showcase.js';

// Read the current source: delayed events and backfills cannot restore stale visibility.
export async function refreshBrandShowcase(db: Firestore, brandId: string, apply = true): Promise<'written' | 'removed' | 'unchanged'> {
  const brandRef = db.collection('brands').doc(brandId);
  const projectionRef = db.collection('brand_showcase').doc(brandId);
  return db.runTransaction(async tx => {
    const [brand, existing] = await Promise.all([tx.get(brandRef), tx.get(projectionRef)]);
    if (!brand.exists) {
      if (!existing.exists) return 'unchanged';
      if (apply) tx.delete(projectionRef);
      return 'removed';
    }
    const projection = buildBrandShowcaseProjection(brand.data()!);
    const current = existing.data();
    const onlySafeFields = current && Object.keys(current).every(key => ['displayName', 'logoUrl', 'visible', 'updatedAt'].includes(key));
    if (onlySafeFields && current.displayName === projection.displayName && current.logoUrl === projection.logoUrl && current.visible === projection.visible) return 'unchanged';
    // Replace, never merge: internal fields must not survive in this projection.
    if (apply) tx.set(projectionRef, { ...projection, updatedAt: FieldValue.serverTimestamp() });
    return 'written';
  });
}

export async function rebuildBrandShowcase(db: Firestore, apply = false) {
  const [brands, projections] = await Promise.all([db.collection('brands').select().get(), db.collection('brand_showcase').select().get()]);
  const ids = new Set([...brands.docs, ...projections.docs].map(doc => doc.id));
  const result = { brands: brands.size, projections: projections.size, written: 0, removed: 0, unchanged: 0 };
  for (const id of ids) result[await refreshBrandShowcase(db, id, apply)]++;
  return result;
}
