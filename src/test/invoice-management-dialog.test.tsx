import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ callManageInvoices: vi.fn() }));
vi.mock('../data/functions/invoice-management.functions', () => api);
import InvoiceManagementDialog from '../components/finance/InvoiceManagementDialog';
const summary = { description: 'Mensalidade', amount: 100, first: '2024-01-20', last: '2027-02-20', total: 38, paid: 2, open: 32, future: 4 };
const invoice = { id: 'i', brandId: 'b', dueDate: '2026-12-20', amount: 100, description: 'Mensalidade', status: 'pending' as const, recurrenceGroupId: 'g' };
const result = { summary, previewId: 'preview', updated: 0, removed: 32, preserved: 6, protected: 2, protectedInvoices: [{ id: 'p', dueDate: '2024-01-20', reason: 'Pagamento confirmado' }] };
beforeEach(() => { vi.clearAllMocks(); api.callManageInvoices.mockImplementation(async data => data.phase === 'inspect' ? { summary } : result); });
it('limpeza antiga calcula no próprio modal e usa apenas uma confirmação curta', async () => {
  const done = vi.fn(); render(<InvoiceManagementDialog invoice={invoice} mode="series" onComplete={done} onClose={vi.fn()} onEditSingle={vi.fn()} />);
  await waitFor(() => expect(screen.getByText(/38 parcelas/)).toBeVisible());
  fireEvent.change(screen.getByLabelText('Operação da recorrência'), { target: { value: 'delete_before' } });
  fireEvent.change(screen.getByLabelText('Excluir faturas anteriores a'), { target: { value: '2026-09-01' } });
  await screen.findByText('32 faturas serão excluídas.');
  expect(screen.queryByText('Gerar prévia')).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(api.callManageInvoices).toHaveBeenLastCalledWith({ phase: 'preview', action: 'delete_before', invoiceId: 'i', before: '2026-09-01' });
  fireEvent.click(screen.getByRole('button', { name: 'Excluir 32 faturas' }));
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  expect(screen.getByText(/Tem certeza que deseja excluir estas 32 faturas/)).toBeVisible();
  expect(done).not.toHaveBeenCalled(); fireEvent.click(screen.getByText('Confirmar exclusão'));
  await screen.findByText('Concluir'); fireEvent.click(screen.getByText('Concluir'));
  expect(done).toHaveBeenCalled(); expect(api.callManageInvoices).toHaveBeenLastCalledWith({ phase: 'confirm', previewId: 'preview' });
});
it('editar vencimento não sobrescreve valores e descrições distintos das próximas parcelas', async () => {
  render(<InvoiceManagementDialog invoice={invoice} mode="series" onComplete={vi.fn()} onClose={vi.fn()} onEditSingle={vi.fn()} />);
  await waitFor(() => expect(screen.getByText('Gerar prévia')).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Novo dia do vencimento'), { target: { value: '31' } }); fireEvent.click(screen.getByText('Gerar prévia'));
  await waitFor(() => expect(api.callManageInvoices).toHaveBeenLastCalledWith({ phase: 'preview', action: 'edit_series', invoiceId: 'i', changes: {}, day: 31 }));
});
it('cancelar uma prévia nunca confirma; edição individual reutiliza callback existente', async () => {
  const close = vi.fn(), single = vi.fn(); render(<InvoiceManagementDialog invoice={invoice} mode="series" onComplete={vi.fn()} onClose={close} onEditSingle={single} />);
  await waitFor(() => expect(screen.getByText('Gerar prévia')).toBeEnabled());
  fireEvent.click(screen.getByText('Editar somente esta fatura')); expect(single).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByText('Gerar prévia')); await screen.findByLabelText('Prévia da operação'); fireEvent.click(screen.getByText('Cancelar'));
  expect(close).toHaveBeenCalledOnce(); expect(api.callManageInvoices.mock.calls.some(([data]) => data.phase === 'confirm')).toBe(false);
});
it('mudança concorrente exige nova prévia e mostra mensagem segura', async () => {
  api.callManageInvoices.mockImplementation(async data => { if (data.phase === 'confirm') throw { code: 'functions/failed-precondition', message: 'As faturas mudaram. Gere uma nova prévia.' }; return data.phase === 'inspect' ? { summary } : result; });
  render(<InvoiceManagementDialog invoice={invoice} mode="series" onComplete={vi.fn()} onClose={vi.fn()} onEditSingle={vi.fn()} />);
  await waitFor(() => expect(screen.getByText('Gerar prévia')).toBeEnabled()); fireEvent.click(screen.getByText('Gerar prévia')); await screen.findByLabelText('Prévia da operação');
  fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: /Confirmar: alterar/ }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Gere uma nova prévia')); expect(screen.queryByLabelText('Prévia da operação')).not.toBeInTheDocument();
});
