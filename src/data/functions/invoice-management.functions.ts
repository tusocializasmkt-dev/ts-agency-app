import { httpsCallable } from 'firebase/functions';
import { functionsClient } from './client';
export interface InvoiceManagementResult {
  previewId?: string; updated?: number; removed?: number; preserved?: number; protected?: number;
  protectedInvoices?: { id: string; dueDate: string; reason: string }[];
  summary: { description: string; amount: number; first: string; last: string; total: number; paid: number; open: number; future: number };
}
export const callManageInvoices = async (data: Record<string, unknown>) => (await httpsCallable<Record<string, unknown>, InvoiceManagementResult>(functionsClient, 'manageInvoiceDocuments')(data)).data;
