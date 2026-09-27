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
  fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar faturas' }), { target: { value: 'open' } });
  expect(screen.getByText(/Pagamento informado pelo cliente/)).toBeVisible(); fireEvent.click(screen.getByRole('button', { name: 'Confirmar pagamento' }));
  await waitFor(() => expect(state.paid).toHaveBeenCalledWith('invoice')); expect(state.report).not.toHaveBeenCalled();
});
it.each([true, false])('filtros e grupos cronológicos funcionam com isAdmin=%s', async isAdmin => {
  state.role = isAdmin ? 'admin' : 'client';
  state.invoices = [
    { id: 'feb', brandId: 'client', description: 'Fevereiro futuro', amount: 100, dueDate: '2099-02-02', status: 'pending' },
    { id: 'oct', brandId: 'client', description: 'Outubro futuro', amount: 100, dueDate: '2098-10-20', status: 'pending' },
    { id: 'old', brandId: 'client', description: 'Cobrança antiga', amount: 100, dueDate: '2024-01-20', status: 'pending' },
  ];
  render(<FinanceView selectedBrandId="client" isAdmin={isAdmin} />);
  expect(screen.getByText('Cobrança antiga')).toBeVisible(); expect(screen.queryByText('Fevereiro futuro')).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar faturas' }), { target: { value: 'future' } });
  expect(screen.queryByText('Cobrança antiga')).not.toBeInTheDocument();
  const titles = screen.getAllByRole('heading', { level: 2 }).map(node => node.textContent);
  expect(titles).toEqual(['outubro de 2098', 'Outubro futuro', 'fevereiro de 2099', 'Fevereiro futuro']);
  if (!isAdmin) { expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument(); }
});
