import { httpsCallable } from 'firebase/functions';
import { functionsClient } from './client';
export interface InvoiceCheckoutResult { checkoutUrl: string; expiresAt: string }
export const callCreateInvoiceCheckout = async (invoiceId: string): Promise<InvoiceCheckoutResult> =>
  (await httpsCallable<{ invoiceId: string }, InvoiceCheckoutResult>(functionsClient, 'createInvoiceCheckout')({ invoiceId })).data;
