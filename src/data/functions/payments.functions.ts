import { httpsCallable } from 'firebase/functions';
import { functionsClient } from './client';
import type { PaymentMethod } from '../../payments';

export interface PaymentIntentResponse { paymentId: string; invoiceId: string; method: PaymentMethod; status: 'created'; amountCents: number; currency: 'BRL'; }
export interface PixPaymentResponse { paymentId: string; invoiceId: string; status: import('../../payments').PaymentStatus; amountCents: number; currency: 'BRL'; pix?: { copyPasteCode: string; qrCodeImage?: string; expiresAt: string }; expiresAt?: string }
export async function callCreatePaymentIntent(invoiceId: string, method: PaymentMethod, idempotencyKey: string): Promise<PaymentIntentResponse> { const callable = httpsCallable<{ invoiceId: string; method: PaymentMethod; idempotencyKey: string }, PaymentIntentResponse>(functionsClient, 'createPaymentIntent'); return (await callable({ invoiceId, method, idempotencyKey })).data; }
export async function callRequestPaymentPromise(invoiceId: string, requestedDate: string, reason: string): Promise<{ invoiceId: string; status: 'pending' }> { const callable = httpsCallable<{ invoiceId: string; requestedDate: string; reason: string }, { invoiceId: string; status: 'pending' }>(functionsClient, 'requestPaymentPromise'); return (await callable({ invoiceId, requestedDate, reason })).data; }
export async function callCreatePixPayment(invoiceId: string, idempotencyKey: string): Promise<PixPaymentResponse> { const callable = httpsCallable<{ invoiceId: string; idempotencyKey: string }, PixPaymentResponse>(functionsClient, 'createPixPayment'); return (await callable({ invoiceId, idempotencyKey })).data; }
