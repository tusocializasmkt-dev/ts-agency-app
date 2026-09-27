import { randomUUID } from 'node:crypto';
import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { assertCheckoutInvoice, checkoutInvoiceId, checkoutInvoiceVersion, CheckoutRejected, invoiceAmountCents, safeCheckoutUrl, type CheckoutInvoice, type CheckoutProvider } from './invoice-checkout-domain.js';

const unavailable = () => new HttpsError('failed-precondition', 'Checkout em análise. Fale com a agência antes de tentar novamente.');
async function authorizedInvoice(db: Firestore, tx: Transaction, uid: string, id: string): Promise<CheckoutInvoice> {
  const [admin, team, brand] = await Promise.all([tx.get(db.doc(`admins/${uid}`)), tx.get(db.doc(`team_members/${uid}`)), tx.get(db.doc(`brands/${uid}`))]);
  const isAdmin = admin.exists && admin.data()?.active !== false;
  if (!isAdmin && (admin.exists || team.exists || !brand.exists || brand.data()?.accessEnabled === false)) throw new HttpsError('permission-denied', 'Acesso negado.');
  const snapshot = await tx.get(db.doc(`invoices/${id}`));
  if (!snapshot.exists) throw new HttpsError('not-found', 'Fatura não encontrada.');
  const invoice = snapshot.data() as CheckoutInvoice;
  if (!isAdmin && invoice.brandId !== uid) throw new HttpsError('permission-denied', 'Acesso negado.');
  assertCheckoutInvoice(invoice);
  return invoice;
}
export async function createInvoiceCheckout(db: Firestore, uid: string, data: unknown, provider: CheckoutProvider, now = () => new Date()): Promise<{ checkoutUrl: string; expiresAt: string }> {
  if (!uid) throw new HttpsError('unauthenticated', 'Entre novamente para continuar.');
  const id = checkoutInvoiceId(data);
  const lock = db.doc(`invoice_checkout_locks/${id}`);
  const candidate = db.collection('payments').doc();
  const owner = randomUUID();
  const reservation = await db.runTransaction(async tx => {
    const invoice = await authorizedInvoice(db, tx, uid, id);
    const version = checkoutInvoiceVersion(invoice);
    const active = await tx.get(lock);
    if (active.exists) {
      const stored = await tx.get(db.collection('payments').doc(active.data()!.paymentId));
      const payment = stored.data();
      if (!payment || payment.integrationMode !== 'checkout_pro' || payment.invoiceVersion !== version) throw unavailable();
      if (['ready', 'declined'].includes(payment.status) && !payment.requiresReview && Date.parse(payment.expiresAt) > now().getTime()) return { reuse: { checkoutUrl: safeCheckoutUrl(payment.checkoutUrl), expiresAt: payment.expiresAt as string } };
      // An expired preference, lost response or dead worker is not proof that no payment exists.
      if (payment.status !== 'failed') throw unavailable();
    }
    const expiresAt = new Date(now().getTime() + 60 * 60_000).toISOString();
    const input = { invoiceId: id, externalReference: candidate.id, amountCents: invoiceAmountCents(invoice.amount), currency: 'BRL' as const, description: String(invoice.description || 'Fatura TS Agency').slice(0, 120), expiresAt };
    tx.create(candidate, { ...input, brandId: invoice.brandId, provider: 'mercado_pago', integrationMode: 'checkout_pro', invoiceVersion: version, idempotencyKey: candidate.id, reservationOwner: owner, status: 'creating', providerStatus: null, requiresReview: false, reconciliationRequired: false, createdBy: uid, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    tx.set(lock, { paymentId: candidate.id, updatedAt: FieldValue.serverTimestamp() });
    return { input, version };
  });
  if ('reuse' in reservation && reservation.reuse) return reservation.reuse;
  const input = reservation.input!;
  let result;
  try {
    // Outside Firestore transaction: retried callbacks never issue external POSTs.
    result = await provider.create(input);
    if (!result.preferenceId || result.preferenceId.length > 256) throw new Error('invalid-preference');
    result.checkoutUrl = safeCheckoutUrl(result.checkoutUrl);
  } catch (error) {
    await db.runTransaction(async tx => {
      const record = await tx.get(candidate);
      if (record.data()?.reservationOwner !== owner || record.data()?.status !== 'creating') return;
      const rejected = error instanceof CheckoutRejected;
      tx.update(candidate, { status: rejected ? 'failed' : 'unknown', requiresReview: !rejected, reconciliationRequired: !rejected, updatedAt: FieldValue.serverTimestamp() });
    });
    throw error instanceof CheckoutRejected ? new HttpsError('unavailable', 'Não foi possível abrir o checkout. Tente novamente mais tarde.') : unavailable();
  }
  // If this commit fails, the reservation remains locked. Never repeat the external request.
  const ready = await db.runTransaction(async tx => {
    const [record, invoiceSnapshot] = await Promise.all([tx.get(candidate), tx.get(db.doc(`invoices/${id}`))]);
    if (record.data()?.reservationOwner !== owner) throw unavailable();
    if (record.data()?.status !== 'creating') {
      // A webhook may validate the reserved checkout before this POST response is committed.
      if (record.data()?.preferenceId === result.preferenceId) tx.update(candidate, { checkoutUrl: result.checkoutUrl, updatedAt: FieldValue.serverTimestamp() });
      return false;
    }
    const invoice = invoiceSnapshot.data() as CheckoutInvoice | undefined;
    const unchanged = invoice && ['pending', 'overdue'].includes(invoice.status) && checkoutInvoiceVersion(invoice) === reservation.version;
    tx.update(candidate, { preferenceId: result.preferenceId, checkoutUrl: result.checkoutUrl, status: unchanged ? 'ready' : 'requires_review', requiresReview: !unchanged, reconciliationRequired: !unchanged, updatedAt: FieldValue.serverTimestamp() });
    return Boolean(unchanged);
  });
  if (!ready) throw unavailable();
  return { checkoutUrl: result.checkoutUrl, expiresAt: input.expiresAt };
}
