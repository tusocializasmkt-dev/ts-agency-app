import type { DocumentData, DocumentSnapshot } from 'firebase/firestore';
import type { AgencyConfig } from '../../types';
import { removeUndefined } from '../firebase';

export function mapAgencyConfig(snapshot: DocumentSnapshot<DocumentData>): AgencyConfig {
  const data = snapshot.data();
  if (!data) throw new Error('Agency configuration does not exist.');
  return data as AgencyConfig;
}

export function toAgencyConfigWriteData(config: AgencyConfig): Record<string, unknown> {
  return removeUndefined({ ...config });
}
