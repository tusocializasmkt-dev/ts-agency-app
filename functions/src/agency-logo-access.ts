import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { HttpsError } from 'firebase-functions/v2/https';
export async function prepareLogoAccess(db: Firestore, auth: Auth, uid?: string) {
  if (!uid) throw new HttpsError('unauthenticated', 'Entre novamente.');
  const profile = await db.collection('admins').doc(uid).get();
  if (!profile.exists || profile.data()?.active === false) throw new HttpsError('permission-denied', 'Acesso administrativo necessário.');
  const user = await auth.getUser(uid);
  if (user.disabled) throw new HttpsError('permission-denied', 'Acesso desativado.');
  if (user.customClaims?.admin !== true) await auth.setCustomUserClaims(uid, { ...user.customClaims, admin: true });
  return { ready: true };
}
