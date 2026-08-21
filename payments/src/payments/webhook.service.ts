import { createHash } from 'node:crypto';
import { FieldValue, type DocumentData, type DocumentReference, type Firestore, type UpdateData } from 'firebase-admin/firestore';
import { InvalidWebhookSignatureError, WebhookSignatureValidator } from 'mercadopago';
import { AppError } from '../shared/errors.js';
import { financialError, financialLog } from '../shared/logging.js';
import { applyApprovedPaymentToInvoice } from './approved-payment.js';
import type { PaymentProvider, ProviderApi, ProviderPayment } from './payment-provider.js';
import type { PaymentStatus } from './payment.types.js';
import { providerTransitionDecision } from './payment.domain.js';

export type WebhookIdentity = { xSignature?: string; xRequestId?: string; dataId?: string; secret: string };
export function verifyMercadoPagoWebhook(input: WebhookIdentity) { try { WebhookSignatureValidator.validate({ xSignature: input.xSignature, xRequestId: input.xRequestId, dataId: input.dataId, secret: input.secret, toleranceSeconds: 300 }); } catch (error) { if (error instanceof InvalidWebhookSignatureError) throw new AppError('permission-denied', 'Assinatura de webhook inválida.'); throw error; } }
const eventKey = (eventId: string, providerId: string) => createHash('sha256').update(`${eventId}:${providerId}`).digest('hex');
const eventType = (status: PaymentStatus | 'unknown') => status === 'unknown' ? 'payment_status_unknown' : `payment_${status}`;
const terminalStatuses: ReadonlySet<string> = new Set(['approved', 'rejected', 'expired', 'cancelled', 'refunded']);

export class PaymentWebhookService {
  constructor(private readonly db: Firestore, private readonly provider: PaymentProvider) {}
  async process(providerPaymentId: string, providerEventId: string, correlationId = providerEventId) {
    const matches = await this.db.collection('payments').where('providerPaymentId', '==', providerPaymentId).limit(1).get();
    if (matches.empty) { financialError('webhook_payment_not_found', { correlationId, providerEventId, providerPaymentId: providerPaymentId.slice(-6) }); return 'ignored'; }
    const providerApi = matches.docs[0].data().providerApi === 'orders' ? 'orders' : 'payments';
    const confirmed = await this.provider.getPaymentStatus(providerPaymentId, providerApi);
    if (confirmed.providerPaymentId !== providerPaymentId) throw new AppError('failed-precondition', 'Pagamento divergente no provedor.');
    return this.apply(matches.docs[0].ref, confirmed, providerEventId, correlationId);
  }
  async reconcile(paymentId: string, correlationId: string) {
    const ref = this.db.doc(`payments/${paymentId}`); const snapshot = await ref.get(); if (!snapshot.exists) throw new AppError('not-found', 'Pagamento não encontrado.'); const data = snapshot.data()!;
    if (typeof data.providerPaymentId !== 'string') throw new AppError('failed-precondition', 'Pagamento ainda não possui identificador do provedor; repita com a mesma chave idempotente.');
    const providerApi: ProviderApi = data.providerApi === 'orders' ? 'orders' : 'payments'; const confirmed = await this.provider.getPaymentStatus(data.providerPaymentId, providerApi); const reconciliationEventId = `reconcile:${paymentId}:${confirmed.status}:${confirmed.paidAt ?? ''}`;
    return this.apply(ref, confirmed, reconciliationEventId, correlationId);
  }
  private async apply(paymentRef: DocumentReference, confirmed: ProviderPayment, providerEventId: string, correlationId: string) {
    let result = 'processed';
    await this.db.runTransaction(async transaction => {
      const paymentSnapshot = await transaction.get(paymentRef); const payment = paymentSnapshot.data()!;
      const marker = this.db.doc(`payment_webhook_events/${eventKey(providerEventId, confirmed.providerPaymentId)}`); const markerSnapshot = await transaction.get(marker); if (markerSnapshot.exists) { result = 'replayed'; return; }
      const attempts = await transaction.get(paymentRef.collection('attempts').where('providerAttemptId', '==', confirmed.providerPaymentId).limit(1)); const attempt = attempts.docs[0];
      const activeRef = this.db.doc(`payment_active_pix/${payment.invoiceId}`); const activeSnapshot = await transaction.get(activeRef);
      const transition = providerTransitionDecision(payment.status as PaymentStatus, confirmed.status); let settlement: 'settled' | 'already-settled' | 'duplicate-review' | undefined;
      if (transition !== 'ignore' && confirmed.status === 'approved') settlement = await applyApprovedPaymentToInvoice(this.db, transaction, payment.invoiceId, paymentRef.id, payment.brandId);
      transaction.create(marker, { provider: 'mercado_pago', providerEventId, providerPaymentId: confirmed.providerPaymentId, receivedAt: FieldValue.serverTimestamp(), processingStatus: 'processed' });
      transaction.create(paymentRef.collection('events').doc(), { paymentId: paymentRef.id, invoiceId: payment.invoiceId, provider: 'mercado_pago', providerEventId, providerPaymentId: confirmed.providerPaymentId, type: eventType(confirmed.status), status: confirmed.status === 'unknown' ? null : confirmed.status, source: 'webhook', processingStatus: confirmed.status === 'unknown' ? 'ignored' : 'processed', receivedAt: FieldValue.serverTimestamp(), processedAt: FieldValue.serverTimestamp() });
      if (transition === 'ignore') { result = 'ignored'; return; } if (transition === 'noop' && settlement !== 'settled' && !confirmed.pix) { result = 'unchanged'; return; }
      const update: UpdateData<DocumentData> = { status: confirmed.status, providerApi: confirmed.providerApi, providerStatusDetail: confirmed.providerStatusDetail ?? null, reconciliationRequired: confirmed.status === 'created' || confirmed.status === 'processing' || !confirmed.pix, updatedAt: FieldValue.serverTimestamp() }; if (confirmed.paidAt) update.paidAt = new Date(confirmed.paidAt); if (confirmed.pix) { update.pix = { copyPasteCode: confirmed.pix.copyPasteCode, ...(confirmed.pix.qrCodeImage ? { qrCodeImage: confirmed.pix.qrCodeImage } : {}) }; update.expiresAt = new Date(confirmed.pix.expiresAt); } transaction.update(paymentRef, update);
      if (attempt) transaction.update(attempt.ref, { status: confirmed.status, ...(terminalStatuses.has(confirmed.status) ? { completedAt: FieldValue.serverTimestamp() } : {}), updatedAt: FieldValue.serverTimestamp() });
      if (terminalStatuses.has(confirmed.status) && activeSnapshot.exists && activeSnapshot.data()?.paymentId === paymentRef.id) transaction.delete(activeRef);
      if (settlement === 'settled') transaction.create(this.db.doc(`notifications/payment-confirmed-${paymentRef.id}`), { recipientUid: payment.brandId, brandId: payment.brandId, type: 'payment_confirmed', title: 'Pagamento confirmado', message: 'Seu pagamento Pix foi confirmado.', link: `/cliente/financeiro/${encodeURIComponent(payment.invoiceId)}/pagar`, entityType: 'invoice', entityId: payment.invoiceId, source: 'system', readAt: null, createdAt: FieldValue.serverTimestamp() });
    });
    financialLog('payment_transition_processed', { correlationId, providerEventId, paymentId: paymentRef.id, providerPaymentId: confirmed.providerPaymentId.slice(-6), status: confirmed.status, result }); return result;
  }
}
