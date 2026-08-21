import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { AgencyConfig } from '../../types';
import { normalizeFirestoreError, type DataListener, type ErrorListener } from '../firebase';
import { mapAgencyConfig, toAgencyConfigWriteData } from '../mappers';

const configRef = doc(db, 'agency_config', 'default');

export const subscribeToAgencyConfig = (onData: DataListener<AgencyConfig>, onError: ErrorListener) =>
  onSnapshot(configRef, snapshot => {
    try { onData(mapAgencyConfig(snapshot)); }
    catch (error) { onError(normalizeFirestoreError(error, 'map', 'agency-config')); }
  }, error => onError(normalizeFirestoreError(error, 'subscribe', 'agency-config')));

export async function updateAgencyConfig(config: AgencyConfig): Promise<void> {
  try {
    await updateDoc(configRef, toAgencyConfigWriteData(config));
  } catch (error) {
    throw normalizeFirestoreError(error, 'update', 'agency-config');
  }
}
