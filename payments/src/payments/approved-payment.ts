import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { approvedPaymentDecision } from './payment.domain.js';

export async function applyApprovedPaymentToInvoice(db: Firestore, transaction: Transaction, invoiceId: string, paymentId: string, brandId: string): Promise<'settled' | 'already-settled' | 'duplicate-review'> {
  const invoiceRef = db.doc(`invoices/${invoiceId}`); const snapshot = await transaction.get(invoiceRef); if (!snapshot.exists) throw new Error('invoice-not-found');
  const invoice = snapshot.data()!; if (typeof invoice.status !== 'string') throw new Error('invalid-invoice'); const decision = approvedPaymentDecision({ status: invoice.status, activePaymentId: typeof invoice.activePaymentId === 'string' ? invoice.activePaymentId : undefined }, paymentId);
  if (decision === 'already-settled') return 'already-settled';
  if (decision === 'duplicate-review') { transaction.create(db.collection(`payments/${paymentId}/events`).doc(), { paymentId, invoiceId, provider: 'mercado_pago', type: 'duplicate_payment_detected', processingStatus: 'processed', source: 'system', receivedAt: FieldValue.serverTimestamp(), processedAt: FieldValue.serverTimestamp() }); return 'duplicate-review'; }
  transaction.update(invoiceRef, { status: 'paid', paidAt: FieldValue.serverTimestamp(), activePaymentId: paymentId, updatedAt: FieldValue.serverTimestamp() });
  transaction.create(db.collection(`invoices/${invoiceId}/history`).doc(), { invoiceId, brandId, action: 'marked_paid', previousStatus: invoice.status, newStatus: 'paid', actorUid: 'system', actorRole: 'admin', note: `Payment ${paymentId}`, createdAt: FieldValue.serverTimestamp() }); return 'settled';
}
