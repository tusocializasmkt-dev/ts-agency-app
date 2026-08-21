import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { app, usingFirebaseEmulators } from '../../lib/firebase';
export const functionsClient = getFunctions(app, 'southamerica-east1');
if (usingFirebaseEmulators) connectFunctionsEmulator(functionsClient, '127.0.0.1', 5001);
