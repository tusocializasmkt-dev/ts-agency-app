import type { Firestore } from 'firebase-admin/firestore';
import { AppError } from '../shared/errors.js';

export type AuthenticatedActor = { uid: string; role: 'admin'; brandId?: never } | { uid: string; role: 'client'; brandId: string };
export function requireAuthenticatedUid(auth: { uid: string } | undefined): string { if (!auth?.uid) throw new AppError('unauthenticated', 'Autenticação necessária.'); return auth.uid; }

export async function resolveAuthenticatedActor(db: Firestore, uid: string): Promise<AuthenticatedActor> {
  if (!uid) throw new AppError('unauthenticated', 'Autenticação necessária.');
  if ((await db.doc(`admins/${uid}`).get()).exists) return { uid, role: 'admin' };
  if ((await db.doc(`brands/${uid}`).get()).exists) return { uid, role: 'client', brandId: uid };
  throw new AppError('permission-denied', 'Perfil de acesso não encontrado.');
}
export function requireAdmin(actor: AuthenticatedActor) { if (actor.role !== 'admin') throw new AppError('permission-denied', 'Acesso administrativo necessário.'); return actor; }
export function requireClient(actor: AuthenticatedActor) { if (actor.role !== 'client') throw new AppError('permission-denied', 'Acesso de cliente necessário.'); return actor; }
export function assertInvoiceAccess(actor: AuthenticatedActor, invoice: { brandId: string }) { if (actor.role === 'client' && actor.brandId !== invoice.brandId) throw new AppError('permission-denied', 'Fatura não pertence ao cliente autenticado.'); }
