import { createHash } from 'node:crypto';
import { FieldValue, type Firestore, type Transaction, type DocumentReference } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { checkoutInvoiceVersion, invoiceAmountCents, type CheckoutInvoice } from './invoice-checkout-domain.js';

type Origin = { kind: 'manual'; adminUid: string } | { kind: 'verified_provider'; paymentId: string; brandId: string; amountCents: number; currency: 'BRL'; invoiceVersion: string };
// Internal only. The caller must authenticate the Admin OR validate provider evidence first.
// There is no callable accepting Origin, and checkout creation never invokes this function.
export function settleInvoice(db: Firestore, tx: Transaction, ref: DocumentReference, invoice: CheckoutInvoice & { settlementPaymentId?: string }, origin: Origin): 'paid' | 'already_paid' | 'requires_review' {
  if (invoice.status === 'paid') return origin.kind === 'manual' || invoice.settlementPaymentId === origin.paymentId ? 'already_paid' : 'requires_review';
  if (!['pending', 'overdue', 'payment_reported'].includes(invoice.status)) {
    if (origin.kind === 'verified_provider') return 'requires_review';
    throw new HttpsError('failed-precondition', 'Esta fatura não pode ser confirmada.');
  }
  if (origin.kind === 'verified_provider' && (invoice.status === 'payment_reported' || origin.brandId !== invoice.brandId || origin.currency !== (invoice.currency || 'BRL') || origin.amountCents !== invoiceAmountCents(invoice.amount) || origin.invoiceVersion !== checkoutInvoiceVersion(invoice))) return 'requires_review';
  const actorUid = origin.kind === 'manual' ? origin.adminUid : 'system:mercado-pago';
  const event = 'payment_confirmed';
  const notificationId = createHash('sha256').update(JSON.stringify([ref.id, event, invoice.brandId])).digest('hex');
  const message = `Fatura ${String(invoice.description || ref.id).slice(0, 80)} — ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.amount)}. Vencimento: ${invoice.dueDate.split('-').reverse().join('/')}.`;
  tx.update(ref, { status: 'paid', paidAt: FieldValue.serverTimestamp(), updatedBy: actorUid, updatedAt: FieldValue.serverTimestamp(), ...(origin.kind === 'manual' ? { confirmedBy: origin.adminUid } : { confirmationSource: 'mercado_pago', settlementPaymentId: origin.paymentId }) });
  tx.create(ref.collection('history').doc(event), { invoiceId: ref.id, brandId: invoice.brandId, action: event, actorUid, actorRole: origin.kind === 'manual' ? 'admin' : 'system', previousStatus: invoice.status, newStatus: 'paid', createdAt: FieldValue.serverTimestamp() });
  tx.create(db.collection('notifications').doc(notificationId), { recipientUid: invoice.brandId, brandId: invoice.brandId, type: event, title: 'Pagamento confirmado', message: message.slice(0, 500), link: '/cliente/financeiro', entityType: 'invoice', entityId: ref.id, readAt: null, source: 'system', createdBy: actorUid, createdAt: FieldValue.serverTimestamp() });
  return 'paid';
}
