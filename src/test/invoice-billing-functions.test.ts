import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ callable: vi.fn().mockResolvedValue({ data: { status: 'payment_reported' } }), httpsCallable: vi.fn() }));
vi.mock('firebase/functions', () => ({ httpsCallable: mocks.httpsCallable.mockImplementation(() => mocks.callable) }));
vi.mock('../data/functions/client', () => ({ functionsClient: { region: 'southamerica-east1' } }));
import { callConfirmInvoicePayment, callReportInvoicePayment } from '../data/functions/invoice-billing.functions';
it('callables recebem só invoiceId; autenticação fica no SDK e autorização no backend', async () => {
  await callReportInvoicePayment('i'); expect(mocks.httpsCallable).toHaveBeenLastCalledWith(expect.anything(), 'reportInvoicePayment'); expect(mocks.callable).toHaveBeenLastCalledWith({ invoiceId: 'i' });
  await callConfirmInvoicePayment('i'); expect(mocks.httpsCallable).toHaveBeenLastCalledWith(expect.anything(), 'confirmInvoicePayment'); expect(mocks.callable).toHaveBeenLastCalledWith({ invoiceId: 'i' });
});
