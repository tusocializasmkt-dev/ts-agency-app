import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { AuthenticatedActor } from '../auth/actor.js';
import { requireClient } from '../auth/actor.js';
import { AppError } from '../shared/errors.js';
import { notifyAdmins } from '../notifications/payment-notifications.js';

const civil = (value: string) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null; const date = new Date(`${value}T00:00:00Z`); return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date; };
export function validatePromiseRequest(invoice: Record<string, unknown>, requestedDate: string, reason: string, now: Date) { if (invoice.status !== 'pending') throw new AppError('failed-precondition', 'Fatura não aceita promessa.'); const due = civil(invoice.dueDate as string); const requested = civil(requestedDate); const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()); if (!due || due.getTime() >= today || !requested || requested.getTime() < today || requested.getTime() > due.getTime() + 15 * 86400000) throw new AppError('failed-precondition', 'Data da promessa inválida.'); if ((invoice.paymentPromise as { status?: string } | undefined)?.status === 'pending') throw new AppError('already-exists', 'Já existe promessa pendente.'); const clean = reason.trim(); if (clean.length < 3 || clean.length > 500) throw new AppError('invalid-argument', 'Justificativa inválida.'); return { requestedDate, reason: clean, status: 'pending' as const }; }
export class PaymentPromiseService {
  constructor(private readonly db: Firestore, private readonly now: () => Date = () => new Date()) {}
  async request(actor: AuthenticatedActor, input: unknown) {
    const client = requireClient(actor); if (!input || typeof input !== 'object') throw new AppError('invalid-argument', 'Dados inválidos.');
    const { invoiceId, requestedDate, reason } = input as Record<string, unknown>; if (typeof invoiceId !== 'string' || typeof requestedDate !== 'string' || typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 500) throw new AppError('invalid-argument', 'Dados inválidos.');
    const invoiceRef = this.db.doc(`invoices/${invoiceId}`); const historyRef = invoiceRef.collection('history').doc();
    await this.db.runTransaction(async transaction => { const snapshot = await transaction.get(invoiceRef); if (!snapshot.exists) throw new AppError('not-found', 'Fatura não encontrada.'); const invoice = snapshot.data()!; if (invoice.brandId !== client.brandId) throw new AppError('permission-denied', 'Fatura não pertence ao cliente.'); const validated = validatePromiseRequest(invoice, requestedDate, reason, this.now()); const promise = { ...validated, requestedAt: Timestamp.now() }; transaction.update(invoiceRef, { paymentPromise: promise, updatedAt: FieldValue.serverTimestamp() }); transaction.create(historyRef, { invoiceId, brandId: client.brandId, action: 'payment_promise_requested', actorUid: client.uid, actorRole: 'client', note: promise.reason, createdAt: FieldValue.serverTimestamp() }); });
    await notifyAdmins(this.db, { brandId: client.brandId, type: 'payment_promise_requested', title: 'Promessa de pagamento solicitada', message: 'Um cliente enviou uma promessa de pagamento.', link: '/admin/financeiro', entityType: 'invoice', entityId: invoiceId }); return { invoiceId, status: 'pending' as const };
  }
}
