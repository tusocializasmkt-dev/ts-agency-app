import { httpsCallable } from 'firebase/functions';
import { auth } from '../lib/firebase';
import { logoAuthorizationError } from './agency-logo.service';
export async function prepareAgencyLogoUpload() {
  try {
  if (!auth.currentUser) throw new Error('Entre novamente para atualizar o logotipo.');
  const { functionsClient } = await import('../data/functions/client');
  await httpsCallable(functionsClient, 'prepareAgencyLogoUpload')({});
  await auth.currentUser.getIdToken(true);
  } catch (error) { throw logoAuthorizationError(error); }
}
