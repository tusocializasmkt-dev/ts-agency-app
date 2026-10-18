// Explicit operator action only. Never run during tests or automatically deploy.
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
const [uid, scope] = process.argv.slice(2);
if (!uid || !['appearance', 'communications', 'both', 'revoke'].includes(scope)) throw new Error('Uso: node functions/scripts/grant-editor-permissions.mjs <UID> <appearance|communications|both|revoke>');
const app = initializeApp({ credential: applicationDefault(), projectId: 'gen-lang-client-0975642231' });
const profile = await getFirestore(app, 'ai-studio-983a0c74-a073-4755-af2a-6e8c97248d58').doc(`admins/${uid}`).get();
if (!profile.exists || profile.data().active === false) throw new Error('Administrador ativo necessário.');
const auth = getAuth(app); const user = await auth.getUser(uid);
if (user.disabled) throw new Error('Conta desativada.');
const claims = { ...user.customClaims };
if (scope === 'revoke') { delete claims.appearanceEditor; delete claims.communicationsEditor; }
else { claims.admin = true; if (scope === 'appearance' || scope === 'both') claims.appearanceEditor = true; if (scope === 'communications' || scope === 'both') claims.communicationsEditor = true; }
await auth.setCustomUserClaims(uid, claims);
await auth.revokeRefreshTokens(uid);
console.log('Permissões atualizadas. Renove a sessão do administrador.');
