import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Invoice } from '../types';
const state = vi.hoisted(() => ({ invoices: [] as Invoice[], listener: undefined as undefined | ((invoices: Invoice[]) => void), callManageInvoices: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('../data/functions/invoice-management.functions', () => ({ callManageInvoices: state.callManageInvoices }));
vi.mock('../services', () => ({ watchBrandInvoices: (_brand: string, listener: (invoices: Invoice[]) => void) => { state.listener = listener; listener(state.invoices); return () => { state.listener = undefined; }; } }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'admin' }, role: 'admin' }) }));
vi.mock('../hooks', async () => ({
  useInvoices: (await import('../hooks/useInvoices')).useInvoices,
  useBrands: () => ({ brands: [] }), useAgencyConfig: () => ({ config: {} }), useFeedback: () => state,
  useModal: () => ({ confirm: vi.fn() }), useFileDownload: () => ({}), useInvoiceBoleto: () => undefined,
}));
vi.mock('../hooks/useInvoiceHistory', () => ({ useInvoiceHistory: () => ({ history: [], loading: false }) }));
import FinanceView from '../components/FinanceView';
beforeEach(() => { vi.clearAllMocks(); state.listener = undefined; });
it.each(['pending', 'paid'] as const)('Admin exclui fatura %s e assinatura atualiza a lista sem recarregar', async status => {
  state.invoices = [{ id: 'invoice', description: 'Cobrança equivocada', brandId: 'client', dueDate: '2026-09-20', amount: 100, status }];
  state.callManageInvoices.mockImplementation(async data => {
    if (data.phase === 'confirm') { state.invoices = []; state.listener?.([]); }
    return { previewId: 'preview', removed: 1, protected: 0, preserved: 0, protectedInvoices: [], summary: {} };
  });
  render(<FinanceView selectedBrandId="client" isAdmin />);
  fireEvent.change(screen.getByLabelText('Filtrar faturas'), { target: { value: 'all' } });
  expect(await screen.findByText('Cobrança equivocada')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
  await screen.findByText('1 fatura será excluída.'); fireEvent.click(screen.getByText('Excluir fatura')); fireEvent.click(screen.getByText('Confirmar exclusão'));
  await waitFor(() => expect(state.success).toHaveBeenCalledWith('1 fatura excluída com sucesso.'));
  expect(screen.queryByText('Cobrança equivocada')).not.toBeInTheDocument(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText('Nenhuma cobrança encontrada.')).toBeVisible();
});
