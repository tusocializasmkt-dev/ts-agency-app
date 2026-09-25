import { httpsCallable } from 'firebase/functions';
import { functionsClient } from './client';

export const callReportInvoicePayment = async (invoiceId: string) => (await httpsCallable<{ invoiceId: string }, { status: string }>(functionsClient, 'reportInvoicePayment')({ invoiceId })).data;
export const callConfirmInvoicePayment = async (invoiceId: string) => (await httpsCallable<{ invoiceId: string }, { status: string }>(functionsClient, 'confirmInvoicePayment')({ invoiceId })).data;
