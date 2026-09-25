import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Invoice } from '../types';
const state = vi.hoisted(() => ({ role: 'client', report: vi.fn(), paid: vi.fn(), confirm: vi.fn(), success: vi.fn(), error: vi.fn(), invoices: [] as Invoice[] }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'client' }, role: state.role }) }));
vi.mock('../hooks', () => ({
  useInvoices: () => ({ invoices: state.invoices, loading: false, reportPayment: state.report, markPaid: state.paid }),
  useBrands: () => ({ brands: [] }), useAgencyConfig: () => ({ config: {} }), useFeedback: () => state,
  useModal: () => ({ confirm: state.confirm }), useFileDownload: () => ({}), useInvoiceBoleto: () => undefined,
}));
vi.mock('../hooks/useInvoiceHistory', () => ({ useInvoiceHistory: () => ({ history: [], loading: false }) }));
import FinanceView from '../components/FinanceView';
beforeEach(() => {
  vi.clearAllMocks(); state.role = 'client'; state.confirm.mockResolvedValue(true); state.report.mockResolvedValue({ status: 'payment_reported' }); state.paid.mockResolvedValue({ status: 'paid' });
  state.invoices = [{ id: 'invoice', brandId: 'client', amount: 100, dueDate: '2026-09-24', status: 'pending' }];
});
it('cliente informa somente após confirmação e nunca chama marcar pago', async () => {
  render(<FinanceView selectedBrandId="client" isAdmin={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Já fiz o pagamento' }));
  await waitFor(() => expect(state.report).toHaveBeenCalledWith('invoice'));
  expect(state.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Informar pagamento?' })); expect(state.paid).not.toHaveBeenCalled();
  expect(state.success).toHaveBeenCalledWith('Pagamento informado. Aguardando confirmação.');
});
it('cancelar confirmação não registra pagamento', async () => {
  state.confirm.mockResolvedValue(false); render(<FinanceView selectedBrandId="client" isAdmin={false} />); fireEvent.click(screen.getByRole('button', { name: 'Já fiz o pagamento' }));
  await waitFor(() => expect(state.confirm).toHaveBeenCalled()); expect(state.report).not.toHaveBeenCalled();
});
it('admin encontra pagamento informado, filtra status e confirma pelo fluxo existente', async () => {
  state.role = 'admin'; state.invoices[0].status = 'payment_reported'; render(<FinanceView selectedBrandId="client" isAdmin />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por status' }), { target: { value: 'payment_reported' } });
  expect(screen.getByText(/Pagamento informado pelo cliente/)).toBeVisible(); fireEvent.click(screen.getByRole('button', { name: 'Confirmar pagamento' }));
  await waitFor(() => expect(state.paid).toHaveBeenCalledWith('invoice')); expect(state.report).not.toHaveBeenCalled();
});
