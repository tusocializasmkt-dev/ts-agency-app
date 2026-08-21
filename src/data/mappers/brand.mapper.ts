import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import type { Brand } from '../../types';
import { removeUndefined } from '../firebase';

export function mapBrand(snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): Brand {
  const data = snapshot.data();
  if (!data) throw new Error('Brand document does not exist.');
  return {
    ...data,
    id: snapshot.id,
    driveUrl: data.driveUrl ?? data.googleDriveLink,
    contractUrl: data.contractUrl ?? data.contractLink,
  } as Brand;
}

export function toBrandWriteData(data: Partial<Brand>): Record<string, unknown> {
  const { id, ...record } = data;
  return removeUndefined(record);
}
