import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = 'gen-lang-client-0975642231';
const databaseId = 'ai-studio-983a0c74-a073-4755-af2a-6e8c97248d58';
const uid = process.argv[2]?.trim();

if (!uid) {
  console.error('Uso: npm run grant:storage-admin -- <ADMIN_UID>');
  process.exit(1);
}

const app = initializeApp({ credential: applicationDefault(), projectId });
const adminProfile = await getFirestore(app, databaseId).collection('admins').doc(uid).get();
if (!adminProfile.exists) {
  console.error(`Operação recusada: admins/${uid} não existe no banco nomeado.`);
  process.exit(1);
}

const auth = getAuth(app);
const user = await auth.getUser(uid);
await auth.setCustomUserClaims(uid, { ...(user.customClaims ?? {}), admin: true });
console.log(`Claim admin=true aplicada a ${uid}. O usuário deve renovar a sessão.`);
