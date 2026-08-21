import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import type { OrganicMetrics, PaidMetrics } from '../../types';

export const mapOrganicMetrics = (snapshot: QueryDocumentSnapshot<DocumentData>): OrganicMetrics =>
  ({ id: snapshot.id, ...snapshot.data() }) as OrganicMetrics;

export const mapPaidMetrics = (snapshot: QueryDocumentSnapshot<DocumentData>): PaidMetrics =>
  ({ id: snapshot.id, ...snapshot.data() }) as PaidMetrics;
