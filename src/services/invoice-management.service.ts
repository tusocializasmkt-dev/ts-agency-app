import { callManageInvoices } from '../data/functions/invoice-management.functions';
export type { InvoiceManagementResult } from '../data/functions/invoice-management.functions';
export const previewInvoiceManagement = (command: Record<string, unknown>) => callManageInvoices({ ...command, phase: 'preview' });
export const confirmInvoiceManagement = (previewId: string) => callManageInvoices({ phase: 'confirm', previewId });
export const inspectInvoiceSeries = (invoiceId: string) => callManageInvoices({ phase: 'inspect', action: 'inspect', invoiceId });
export function invoiceManagementError(error: unknown): string {
  const cause = error as { code?: string; message?: string };
  if (cause?.code === 'functions/failed-precondition' || cause?.code === 'functions/invalid-argument') return cause.message || 'Confira os dados e gere uma nova prévia.';
  if (cause?.code === 'functions/permission-denied') return 'Somente Admin pode gerenciar faturas.';
  if (cause?.code === 'functions/unauthenticated') return 'Sua sessão expirou. Entre novamente.';
  return 'Não foi possível concluir. Atualize a tela e tente novamente.';
}
