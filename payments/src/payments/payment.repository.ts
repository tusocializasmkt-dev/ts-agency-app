import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { AppError } from '../shared/errors.js';
import type { AuthenticatedActor } from '../auth/actor.js';
import type { PaymentAttemptRecord, PaymentIntentResult, PaymentRecord, PixPaymentResult } from './payment.types.js';
import { assertPixCapacity } from './payment.domain.js';
import type { ProviderErrorDiagnostics } from './provider-error.js';
import type { ProviderPayment } from './payment-provider.js';

export interface IntentRepository { createIntent(actor: AuthenticatedActor, invoiceId: string, build: (invoice: Record<string, unknown>, paymentId: string) => { payment: PaymentRecord; attempt: PaymentAttemptRecord }): Promise<PaymentIntentResult>; }
export type StoredPixPayment = Record<string, unknown> & { status?: string; pix?: { copyPasteCode?: string; qrCodeImage?: string }; expiresAt?: string | Date | { toDate(): Date } };
export interface PixRepository extends IntentRepository { getPayment(paymentId: string): Promise<StoredPixPayment>; saveCreatedPix(paymentId: string, provider: ProviderPayment): Promise<PixPaymentResult>; markProviderOutcomeUncertain(paymentId: string, diagnostics?: ProviderErrorDiagnostics): Promise<void>; }
export class FirestorePaymentRepository implements PixRepository {
  constructor(private readonly db: Firestore) {}
  async createIntent(actor: AuthenticatedActor, invoiceId: string, build: (invoice: Record<string, unknown>, paymentId: string) => { payment: PaymentRecord; attempt: PaymentAttemptRecord }): Promise<PaymentIntentResult> {
    const paymentRef = this.db.collection('payments').doc();
    return this.db.runTransaction(async transaction => {
      const invoiceSnapshot = await transaction.get(this.db.doc(`invoices/${invoiceId}`));
      if (!invoiceSnapshot.exists) throw new AppError('not-found', 'Fatura não encontrada.');
      const invoice = invoiceSnapshot.data()!;
      const { payment, attempt } = build(invoice, paymentRef.id);
      const keyRef = this.db.doc(`payment_idempotency/${payment.idempotencyKey}`);
      const keySnapshot = await transaction.get(keyRef);
      if (keySnapshot.exists) {
        const existing = keySnapshot.data()!;
        if (existing.uid !== actor.uid || existing.invoiceId !== invoiceId || existing.method !== payment.method) throw new AppError('already-exists', 'Chave idempotente já utilizada em outra intenção.');
        return { paymentId: existing.paymentId, invoiceId, method: existing.method, status: 'created', amountCents: existing.amountCents, currency: 'BRL' };
      }
      const activeRef = this.db.doc(`payment_active_pix/${invoiceId}`); const activeSnapshot = await transaction.get(activeRef);
      const rateRef = this.db.doc(`payment_rate_limits/${actor.uid}_${invoiceId}`); const rateSnapshot = await transaction.get(rateRef); const rate = rateSnapshot.data(); const now = Date.now(); const startedAt = rate?.windowStartedAt?.toMillis?.() ?? 0; const withinWindow = now - startedAt < 60 * 60_000; const attemptsInWindow = withinWindow && typeof rate?.attempts === 'number' ? rate.attempts : 0;
      if (payment.method === 'pix') assertPixCapacity(activeSnapshot.exists, attemptsInWindow);
      transaction.create(paymentRef, { ...payment, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      transaction.create(paymentRef.collection('attempts').doc(), { ...attempt, createdAt: FieldValue.serverTimestamp() });
      transaction.create(paymentRef.collection('events').doc(), { paymentId: paymentRef.id, invoiceId, provider: 'mercado_pago', type: 'payment_intent_created', source: 'system', processingStatus: 'processed', receivedAt: FieldValue.serverTimestamp(), processedAt: FieldValue.serverTimestamp() });
      transaction.create(keyRef, { uid: actor.uid, invoiceId, method: payment.method, paymentId: paymentRef.id, amountCents: payment.amountCents, status: 'created', createdAt: FieldValue.serverTimestamp() });
      if (payment.method === 'pix') transaction.create(activeRef, { paymentId: paymentRef.id, invoiceId, uid: actor.uid, status: 'created', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      transaction.set(rateRef, { uid: actor.uid, invoiceId, attempts: attemptsInWindow + 1, windowStartedAt: withinWindow ? rate!.windowStartedAt : FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      return { paymentId: paymentRef.id, invoiceId, method: payment.method, status: 'created', amountCents: payment.amountCents, currency: 'BRL' };
    });
  }
  async getPayment(paymentId: string) { const snapshot = await this.db.doc(`payments/${paymentId}`).get(); if (!snapshot.exists) throw new AppError('not-found', 'Pagamento não encontrado.'); return snapshot.data()!; }
  async saveCreatedPix(paymentId: string, provider: ProviderPayment): Promise<PixPaymentResult> {
    if (provider.status !== 'created' && provider.status !== 'pending' && provider.status !== 'processing') throw new AppError('failed-precondition', 'Status inicial Pix inesperado.');
    const initialStatus = provider.status;
    return this.db.runTransaction(async transaction => {
      const ref = this.db.doc(`payments/${paymentId}`); const snapshot = await transaction.get(ref); if (!snapshot.exists) throw new AppError('not-found', 'Pagamento não encontrado.'); const data = snapshot.data()!;
      if (data.status === 'pending' && data.pix?.copyPasteCode && data.expiresAt) return { paymentId, invoiceId: data.invoiceId, status: data.status, amountCents: data.amountCents, currency: 'BRL', pix: { ...data.pix, expiresAt: data.expiresAt.toDate ? data.expiresAt.toDate().toISOString() : data.expiresAt } };
      const attemptQuery = this.db.collection(`payments/${paymentId}/attempts`).where('idempotencyKey', '==', data.idempotencyKey).limit(1); const attempts = await transaction.get(attemptQuery); const attempt = attempts.docs[0];
      const expiresAt = provider.pix?.expiresAt ?? provider.expiresAt;
      transaction.update(ref, { status: provider.status, providerPaymentId: provider.providerPaymentId, providerApi: provider.providerApi, providerStatusDetail: provider.providerStatusDetail ?? null, reconciliationRequired: provider.status === 'created' || provider.status === 'processing' || !provider.pix, ...(provider.pix ? { pix: { copyPasteCode: provider.pix.copyPasteCode, ...(provider.pix.qrCodeImage ? { qrCodeImage: provider.pix.qrCodeImage } : {}) } } : {}), ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}), updatedAt: FieldValue.serverTimestamp() });
      transaction.set(this.db.doc(`payment_active_pix/${data.invoiceId}`), { paymentId, invoiceId: data.invoiceId, uid: data.brandId, status: provider.status, ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      if (attempt) transaction.update(attempt.ref, { status: provider.status, providerAttemptId: provider.providerPaymentId, updatedAt: FieldValue.serverTimestamp() });
      transaction.create(ref.collection('events').doc(), { paymentId, invoiceId: data.invoiceId, provider: 'mercado_pago', providerApi: provider.providerApi, providerPaymentId: provider.providerPaymentId, type: provider.pix ? 'pix_created' : 'pix_processing', status: provider.status, source: 'provider', processingStatus: 'processed', receivedAt: FieldValue.serverTimestamp(), processedAt: FieldValue.serverTimestamp() });
      return { paymentId, invoiceId: data.invoiceId, status: initialStatus, amountCents: data.amountCents, currency: 'BRL', ...(provider.pix ? { pix: provider.pix } : {}), ...(expiresAt ? { expiresAt } : {}) };
    });
  }
  async markProviderOutcomeUncertain(paymentId: string, diagnostics?: ProviderErrorDiagnostics) { const ref = this.db.doc(`payments/${paymentId}`); await this.db.runTransaction(async transaction => { const snapshot = await transaction.get(ref); if (!snapshot.exists || snapshot.data()?.status !== 'created') return; const safeDiagnostics = diagnostics ? { category: diagnostics.category, retryable: diagnostics.retryable, ...(diagnostics.httpStatus !== undefined ? { httpStatus: diagnostics.httpStatus } : {}), ...(diagnostics.providerCode ? { providerCode: diagnostics.providerCode } : {}) } : undefined; transaction.update(ref, { providerOutcome: 'unknown', reconciliationRequired: true, updatedAt: FieldValue.serverTimestamp() }); transaction.create(ref.collection('events').doc(), { paymentId, invoiceId: snapshot.data()!.invoiceId, provider: 'mercado_pago', type: 'provider_create_uncertain', source: 'system', processingStatus: 'failed', ...(safeDiagnostics ? { providerError: safeDiagnostics } : {}), receivedAt: FieldValue.serverTimestamp(), processedAt: FieldValue.serverTimestamp() }); }); }
}
