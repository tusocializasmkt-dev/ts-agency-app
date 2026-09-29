import { isOrderId } from './mercado-pago-checkout.js';
import { createHash, randomUUID } from 'node:crypto';
import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { checkoutInvoiceId, checkoutInvoiceVersion, invoiceAmountCents, type CheckoutInvoice } from './invoice-checkout-domain.js';
import { settleInvoice } from './invoice-settlement.js';
import type { PaymentReader, ProviderPayment } from './checkout-payment-provider.js';

export interface PaymentPolicy { collectorId: string; liveMode: boolean }
export interface ProcessingResult { outcome: string; retryable: boolean }
const stamp = () => FieldValue.serverTimestamp();
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const safeId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const closedExternal = new Set(['rejected', 'cancelled', 'expired']);
const critical = new Set(['refunded', 'charged_back', 'chargeback', 'contested', 'in_mediation']);

async function reviewRecipients(db: Firestore, tx: Transaction) {
  const profiles = await tx.get(db.collection('admins'));
  const recipients = profiles.docs.filter(p => p.data().active !== false).map(p => p.id);
  if (recipients.length > 450) throw new Error('too-many-review-recipients');
  return recipients;
}
async function notifyReview(db: Firestore, tx: Transaction, recipients: string[], key: string, reason: string, invoiceId = '', brandId = '') {
  // One signal per resource/reason/recipient, regardless of delivery ID or retry count.
  const refs = recipients.map(uid => db.doc(`notifications/${hash(`checkout-review:${key}:${reason}:${uid}`)}`));
  const existing = refs.length ? await tx.getAll(...refs) : [];
  for (let index = 0; index < recipients.length; index++) {
    if (existing[index].exists) continue;
    const uid = recipients[index];
    tx.create(refs[index], {
    recipientUid: uid, brandId, type: 'checkout_review', title: 'Pagamento exige revisão',
    message: 'Uma transação do checkout precisa de conferência administrativa. Consulte a reconciliação antes de realizar qualquer ajuste.',
    link: '/admin/financeiro', entityType: 'invoice', entityId: invoiceId, source: 'system', createdBy: 'system:mercado-pago',
    reviewReason: reason, reviewResourceId: key,
    createdAt: stamp(), readAt: null,
    });
  }
}
// All external reads occur before the transaction. This is the only automatic settlement policy.
export async function processCheckoutEvent(db: Firestore, eventId: string, externalPaymentId: string, reader: PaymentReader, policy: PaymentPolicy, expectedReference?: string): Promise<ProcessingResult> {
  if (!safeId(eventId) || !(/^\d{1,32}$/.test(externalPaymentId) || isOrderId(externalPaymentId))) throw new Error('invalid-processing-id');
  const eventRef = db.doc(`checkout_webhook_events/${eventId}`);
  const done = await db.runTransaction(async tx => {
    const event = await tx.get(eventRef);
    if (event.exists && event.data()?.externalPaymentId !== externalPaymentId) throw new Error('event-conflict');
    if (event.data()?.status === 'processed') return true;
    tx.set(eventRef, { externalPaymentId, status: 'received', attempts: FieldValue.increment(1), updatedAt: stamp(), ...(!event.exists ? { createdAt: stamp() } : {}) }, { merge: true });
    return false;
  });
  if (done) return { outcome: 'duplicate', retryable: false };
  let remote: ProviderPayment;
  try { remote = await reader.getPayment(externalPaymentId); }
  catch {
    await db.runTransaction(async tx => {
      const event = await tx.get(eventRef);
      if (event.data()?.status !== 'processed') tx.update(eventRef, { status: 'retryable', reason: 'provider_unavailable', updatedAt: stamp() });
    });
    return { outcome: 'provider_unavailable', retryable: true };
  }
  return db.runTransaction(async tx => {
    const event = await tx.get(eventRef);
    if (event.data()?.status === 'processed') return { outcome: 'duplicate', retryable: false };
    const recipients = await reviewRecipients(db, tx);
    const localRef = safeId(remote.externalReference) ? db.doc(`payments/${remote.externalReference}`) : null;
    const local = localRef ? (await tx.get(localRef)).data() : undefined;
    const finish = (outcome: string, retryable = false) => {
      tx.set(eventRef, { status: retryable ? 'retryable' : 'processed', outcome, requiresReview: retryable || outcome === 'requires_review', localPaymentId: localRef?.id || null, updatedAt: stamp() }, { merge: true });
      return { outcome, retryable };
    };
    if (!local || local.integrationMode !== 'checkout_pro' || local.provider !== 'mercado_pago') {
      await notifyReview(db, tx, recipients, externalPaymentId, 'association_missing');
      return finish('association_missing', true);
    }
    const invoiceRef = safeId(local.invoiceId) ? db.doc(`invoices/${local.invoiceId}`) : null;
    const invoice = invoiceRef ? (await tx.get(invoiceRef)).data() as (CheckoutInvoice & { settlementPaymentId?: string }) | undefined : undefined;
    const providerRef = db.doc(`checkout_provider_payments/${externalPaymentId}`);
    const previous = (await tx.get(providerRef)).data();
    const related = await tx.get(db.collection('checkout_provider_payments').where('localPaymentId', '==', localRef!.id).limit(51));
    const anotherPending = related.docs.some(doc => doc.id !== externalPaymentId && ['pending', 'in_process', 'authorized'].includes(doc.data().providerStatus));
    let reason = '';
    if (remote.id !== externalPaymentId || remote.collectorId !== policy.collectorId || (remote.liveMode !== policy.liveMode && !(remote.providerOrderId && remote.liveMode === undefined))) reason = 'provider_identity_mismatch';
    else if (!remote.associationValid || remote.externalReference !== localRef!.id || local.externalReference !== localRef!.id || (expectedReference && remote.externalReference !== expectedReference) || (remote.providerOrderId ? (local.apiVersion !== 'orders' || (local.providerOrderId && remote.providerOrderId !== local.providerOrderId)) : (local.apiVersion === 'orders' || remote.invoiceId !== local.invoiceId || (local.preferenceId && remote.preferenceId !== local.preferenceId))) || (previous && previous.localPaymentId !== localRef!.id)) reason = 'association_mismatch';
    else if (!invoice || invoice.brandId !== local.brandId) reason = 'invoice_missing_or_mismatched';
    else {
      try {
        if (remote.amountCents !== local.amountCents || remote.amountCents !== invoiceAmountCents(invoice.amount) || remote.currency !== 'BRL' || remote.currency !== local.currency || remote.currency !== (invoice.currency || 'BRL') || checkoutInvoiceVersion(invoice) !== local.invoiceVersion) reason = 'financial_mismatch';
      } catch { reason = 'financial_mismatch'; }
    }
    if (!Number.isFinite(remote.updatedAtMs)) reason = 'invalid_provider_time';
    if (related.size > 50) reason = 'too_many_provider_payments';
    // Never let a late query overwrite a newer state. Payment IDs have independent watermarks.
    if (!reason && previous && remote.updatedAtMs < previous.providerUpdatedAtMs) return finish('stale');
    if (!reason && previous && remote.updatedAtMs === previous.providerUpdatedAtMs && remote.status !== previous.providerStatus) reason = 'conflicting_provider_state';
    if (!reason && (critical.has(remote.status) || remote.refunded)) reason = 'critical_provider_state';
    let internalStatus = local.status;
    if (!reason && remote.status === 'approved') {
      const result = settleInvoice(db, tx, invoiceRef!, invoice!, { kind: 'verified_provider', paymentId: `mercado_pago:${externalPaymentId}`, brandId: local.brandId, amountCents: remote.amountCents, currency: 'BRL', invoiceVersion: local.invoiceVersion });
      if (result === 'requires_review') reason = invoice!.status === 'paid' ? 'possible_duplicate_payment' : 'invoice_not_settleable';
      else internalStatus = 'approved';
    } else if (!reason && ['pending', 'in_process', 'authorized'].includes(remote.status)) {
      if (previous?.providerStatus === 'approved') reason = 'provider_state_regression';
      else if (local.status !== 'approved' && !local.requiresReview) internalStatus = 'pending';
    } else if (!reason && closedExternal.has(remote.status)) {
      if (previous?.providerStatus === 'approved') reason = 'provider_state_regression';
      else if (local.status !== 'approved' && !local.requiresReview) internalStatus = anotherPending ? 'pending' : 'declined';
    } else if (!reason) reason = 'unknown_provider_status';
    if (reason) {
      await notifyReview(db, tx, recipients, externalPaymentId, reason, local.invoiceId, local.brandId);
      tx.update(localRef!, { requiresReview: true, reconciliationRequired: true, reviewReason: reason, status: local.status === 'approved' ? 'approved' : 'requires_review', updatedAt: stamp() });
    } else {
      tx.update(localRef!, { status: internalStatus, ...(remote.providerOrderId ? { providerOrderId: remote.providerOrderId } : { preferenceId: remote.preferenceId }), externalPaymentId, providerStatus: remote.status,
        // Keep review flags sticky: a later good snapshot cannot dismiss another disputed transaction.
        requiresReview: local.requiresReview === true, reconciliationRequired: local.requiresReview === true,
        updatedAt: stamp() });
    }
    // Never rebind an external ID or regress its watermark on a mismatched observation.
    if ((!previous || previous.localPaymentId === localRef!.id) && remote.id === externalPaymentId
      && remote.collectorId === policy.collectorId && (remote.liveMode === policy.liveMode || (remote.providerOrderId && remote.liveMode === undefined))
      && Number.isFinite(remote.updatedAtMs) && (!previous || remote.updatedAtMs >= previous.providerUpdatedAtMs)) {
      tx.set(providerRef, { localPaymentId: localRef!.id, externalPaymentId, providerStatus: remote.status, providerUpdatedAtMs: remote.updatedAtMs,
        requiresReview: Boolean(reason), reason: reason || null, updatedAt: stamp() }, { merge: true });
    }
    return finish(reason ? 'requires_review' : internalStatus);
  });
}

export async function assertCheckoutAdmin(db: Firestore, uid: string): Promise<void> {
  if (!uid) throw new HttpsError('unauthenticated', 'Entre novamente.');
  const profile = await db.doc(`admins/${uid}`).get();
  if (!profile.exists || profile.data()?.active === false) throw new HttpsError('permission-denied', 'Somente administradores podem reconciliar pagamentos.');
}
export async function reconcileCheckout(db: Firestore, uid: string, data: unknown, reader: PaymentReader, policy: PaymentPolicy): Promise<ProcessingResult[]> {
  await assertCheckoutAdmin(db, uid);
  const input = data as { paymentId?: unknown; eventId?: unknown } | null;
  if (!input || Boolean(input.paymentId) === Boolean(input.eventId)) throw new HttpsError('invalid-argument', 'Informe uma tentativa ou evento.');
  if (input.eventId) {
    if (!safeId(input.eventId)) throw new HttpsError('invalid-argument', 'Evento inválido.');
    const event = (await db.doc(`checkout_webhook_events/${input.eventId}`).get()).data();
    if (!event || !(/^\d{1,32}$/.test(event.externalPaymentId) || isOrderId(event.externalPaymentId))) throw new HttpsError('not-found', 'Evento não encontrado.');
    // Re-query even a previously processed event to recover later provider transitions.
    const result = await processCheckoutEvent(db, `reconcile_${randomUUID()}`, event.externalPaymentId, reader, policy);
    if (!result.retryable) await db.doc(`checkout_webhook_events/${input.eventId}`).set({ status: 'processed', outcome: result.outcome, reconciledBy: uid, reconciledAt: stamp() }, { merge: true });
    return [result];
  }
  if (!safeId(input.paymentId)) throw new HttpsError('invalid-argument', 'Tentativa inválida.');
  const ref = db.doc(`payments/${input.paymentId}`);
  const payment = (await ref.get()).data();
  if (!payment || payment.integrationMode !== 'checkout_pro' || payment.externalReference !== ref.id) throw new HttpsError('not-found', 'Tentativa não encontrada.');
  checkoutInvoiceId({ invoiceId: payment.invoiceId });
  let ids: string[];
  try {
    if (payment.apiVersion === 'orders') {
      if (!isOrderId(payment.providerOrderId)) throw new Error('order-id-unresolved');
      ids = [payment.providerOrderId];
    } else ids = await reader.searchPayments(ref.id);
  }
  catch { throw new HttpsError('unavailable', 'Consulta indisponível. Tente novamente mais tarde.'); }
  if (!ids.length) {
    await db.runTransaction(async tx => {
      const current = await tx.get(ref);
      const recipients = await reviewRecipients(db, tx);
      await notifyReview(db, tx, recipients, ref.id, 'no_provider_payment', payment.invoiceId, payment.brandId);
      if (current.data()?.status !== 'approved') tx.update(ref, { requiresReview: true, reconciliationRequired: true, reviewReason: 'no_provider_payment', updatedAt: stamp() });
    });
    return [{ outcome: 'no_provider_payment', retryable: true }];
  }
  // Bounded work per call; refuse an oversized search instead of silently settling a subset.
  if (ids.length > 10) throw new HttpsError('resource-exhausted', 'Muitas transações. Solicite revisão especializada.');
  const results: ProcessingResult[] = [];
  for (const id of ids) results.push(await processCheckoutEvent(db, `reconcile_${randomUUID()}`, id, reader, policy, ref.id));
  return results;
}
