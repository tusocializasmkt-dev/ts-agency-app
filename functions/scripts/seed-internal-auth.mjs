import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { hashPassword, normalizeEmail } from '../lib/internal-auth.js';

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Este comando só pode ser executado com Auth e Firestore Emulators ativos.');
const password = process.env.TS_AGENCY_ADMIN_PASSWORD;
if (!password) throw new Error('Defina TS_AGENCY_ADMIN_PASSWORD apenas no processo local.');

const projectId = process.env.GCLOUD_PROJECT || 'demo-ts-agency-internal-auth';
const app = getApps()[0] ?? initializeApp({ projectId });
const auth = getAuth(app);
const db = getFirestore(app, process.env.FIRESTORE_DATABASE_ID || 'ai-studio-983a0c74-a073-4755-af2a-6e8c97248d58');
const uid = 'admin-dani-bandeira';
const emailNormalized = normalizeEmail('tusocializasmkt@gmail.com');

try { await auth.getUser(uid); await auth.updateUser(uid, { email: emailNormalized, displayName: 'Dani Bandeira', disabled: false }); }
catch { await auth.createUser({ uid, email: emailNormalized, displayName: 'Dani Bandeira', disabled: false }); }
await db.collection('admins').doc(uid).set({ name: 'Dani Bandeira', email: emailNormalized, role: 'admin', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
const { passwordHash, passwordSalt } = await hashPassword(password);
await db.collection('internal_credentials').doc(uid).set({ uid, emailNormalized, passwordHash, passwordSalt, displayName: 'Dani Bandeira', role: 'admin', active: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
console.log('Administrador principal criado no Emulator.');
