import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Payment, PaymentAttempt, PaymentEvent } from '../../payments';
import { mapPayment, mapPaymentAttempt, mapPaymentEvent } from '../mappers';
import { normalizeFirestoreError, subscribeToQuery, type DataListener, type ErrorListener } from '../firebase';
const payments = collection(db, 'payments');
export async function getPayment(id: string): Promise<Payment | null> { try { const item = await getDoc(doc(db, 'payments', id)); return item.exists() ? mapPayment(item) : null; } catch (error) { throw normalizeFirestoreError(error, 'get', 'payment'); } }
export const subscribeToPayment = (paymentId: string, onData: DataListener<Payment | null>, onError: ErrorListener) => onSnapshot(doc(db, 'payments', paymentId), snapshot => onData(snapshot.exists() ? mapPayment(snapshot) : null), onError);
export const subscribeToInvoicePayments = (invoiceId: string, onData: DataListener<Payment[]>, onError: ErrorListener) => subscribeToQuery(query(payments, where('invoiceId', '==', invoiceId), orderBy('createdAt', 'desc')), mapPayment, onData, onError, 'payment', 'subscribe-by-invoice');
export const subscribeToPaymentAttempts = (paymentId: string, onData: DataListener<PaymentAttempt[]>, onError: ErrorListener) => subscribeToQuery(query(collection(db, 'payments', paymentId, 'attempts'), orderBy('createdAt', 'desc')), mapPaymentAttempt, onData, onError, 'payment-attempt', 'subscribe');
export const subscribeToPaymentEvents = (paymentId: string, onData: DataListener<PaymentEvent[]>, onError: ErrorListener) => subscribeToQuery(query(collection(db, 'payments', paymentId, 'events'), orderBy('receivedAt', 'desc')), mapPaymentEvent, onData, onError, 'payment-event', 'subscribe');
