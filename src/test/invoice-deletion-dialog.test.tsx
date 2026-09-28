import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ callManageInvoices: vi.fn() }));
vi.mock('../data/functions/invoice-management.functions', () => api);
import InvoiceDeletionDialog from '../components/finance/InvoiceDeletionDialog';
const invoice = { id: 'i', brandId: 'b', dueDate: '2026-09-20', amount: 100, status: 'paid' as const, recurrenceGroupId: 'g' };
const summary = { description: 'Série', amount: 100, first: '2024-01-20', last: '2027-01-20', total: 37, paid: 32, open: 0, future: 5 };
const result = { summary, previewId: 'p', removed: 1, protected: 0, preserved: 36, protectedInvoices: [] };
beforeEach(() => { vi.clearAllMocks(); api.callManageInvoices.mockResolvedValue(result); });

it.each(['delete', 'delete_series', 'delete_before', 'delete_all'])('operação %s calcula automaticamente e confirma somente pelo ID técnico', async action => {
  const done = vi.fn(); render(<InvoiceDeletionDialog invoice={invoice} initialAction={action} onClose={vi.fn()} onComplete={done} />);
  if (action === 'delete_before') {
    expect(api.callManageInvoices).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Excluir faturas anteriores a'), { target: { value: '2026-09-20' } });
  }
  await screen.findByText('1 fatura será excluída.');
  expect(api.callManageInvoices).toHaveBeenCalledWith({ phase: 'preview', action, invoiceId: 'i', ...(action === 'delete_before' ? { before: '2026-09-20' } : {}) });
  expect(screen.getAllByRole('option')).toHaveLength(4);
  expect(screen.queryByText('Gerar prévia')).not.toBeInTheDocument(); expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Excluir fatura')); expect(screen.getAllByRole('dialog')).toHaveLength(1);
  expect(api.callManageInvoices).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText('Confirmar exclusão')); await waitFor(() => expect(done).toHaveBeenCalledWith('1 fatura excluída com sucesso.'));
  expect(api.callManageInvoices).toHaveBeenLastCalledWith({ phase: 'confirm', previewId: 'p' });
});
it('cancelar confirmação não exclui e fatura avulsa não oferece ações de série', async () => {
  const close = vi.fn(); render(<InvoiceDeletionDialog invoice={{ ...invoice, recurrenceGroupId: undefined }} onClose={close} onComplete={vi.fn()} />);
  await screen.findByText('1 fatura será excluída.'); expect(screen.getAllByRole('option')).toHaveLength(1);
  fireEvent.click(screen.getByText('Excluir fatura')); fireEvent.click(screen.getByText('Cancelar'));
  expect(close).toHaveBeenCalledOnce(); expect(api.callManageInvoices).toHaveBeenCalledTimes(1);
});
it('resposta de seleção antiga não habilita exclusão de parâmetros novos', async () => {
  let resolveOld!: (value: typeof result) => void;
  api.callManageInvoices.mockImplementation(data => data.action === 'delete' ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve({ ...result, removed: 31, previewId: 'new' }));
  render(<InvoiceDeletionDialog invoice={invoice} onClose={vi.fn()} onComplete={vi.fn()} />);
  await waitFor(() => expect(api.callManageInvoices).toHaveBeenCalled());
  fireEvent.change(screen.getByLabelText('Operação de exclusão'), { target: { value: 'delete_all' } });
  await screen.findByText('31 faturas serão excluídas.');
  await act(async () => resolveOld(result)); expect(screen.queryByText('1 fatura será excluída.')).not.toBeInTheDocument();
  expect(screen.getByText('Excluir 31 faturas')).toBeEnabled();
});
it('proteção surgida na confirmação atualiza resultado e detalhes sem abrir outro modal', async () => {
  const protectedInvoice = { id: 'external', dueDate: '2026-09-20', reason: 'Pagamento externo, checkout ou tentativa vinculada: fatura preservada.' };
  api.callManageInvoices.mockImplementation(async data => data.phase === 'preview' ? { ...result, removed: 31 } : { ...result, removed: 30, protected: 1, protectedInvoices: [protectedInvoice] });
  const done = vi.fn(); render(<InvoiceDeletionDialog invoice={invoice} initialAction="delete_all" onClose={vi.fn()} onComplete={done} />);
  await screen.findByText('31 faturas serão excluídas.'); fireEvent.click(screen.getByText('Excluir 31 faturas')); fireEvent.click(screen.getByText('Confirmar exclusão'));
  await screen.findByText('30 faturas excluídas. 1 fatura protegida foi preservada.');
  expect(screen.getByText(/1 fatura foi preservada porque possui pagamento externo vinculado/)).toBeVisible();
  expect(screen.getAllByRole('dialog')).toHaveLength(1); expect(screen.getByText(/Fatura external:/)).toBeInTheDocument();
  fireEvent.click(screen.getByText('Concluir')); expect(done).toHaveBeenCalledOnce();
});
it('nenhuma elegível apresenta proteção e mantém exclusão desabilitada', async () => {
  api.callManageInvoices.mockResolvedValue({ ...result, removed: 0, protected: 1, protectedInvoices: [{ id: 'external', dueDate: '2026-09-20', reason: 'Pagamento externo vinculado.' }] });
  render(<InvoiceDeletionDialog invoice={invoice} onClose={vi.fn()} onComplete={vi.fn()} />);
  await screen.findByText('Nenhuma fatura elegível nesta seleção.'); expect(screen.getByText('Excluir 0 faturas')).toBeDisabled();
  expect(screen.getByText(/1 fatura será preservada porque possui pagamento externo vinculado/)).toBeVisible();
});
it('duplo clique na confirmação não dispara duas exclusões', async () => {
  let complete!: (value: typeof result) => void;
  api.callManageInvoices.mockImplementation(data => data.phase === 'preview' ? Promise.resolve(result) : new Promise(resolve => { complete = resolve; }));
  const done = vi.fn(); render(<InvoiceDeletionDialog invoice={invoice} onClose={vi.fn()} onComplete={done} />);
  await screen.findByText('1 fatura será excluída.'); fireEvent.click(screen.getByText('Excluir fatura'));
  const button = screen.getByText('Confirmar exclusão'); fireEvent.click(button); fireEvent.click(button);
  expect(api.callManageInvoices.mock.calls.filter(([data]) => data.phase === 'confirm')).toHaveLength(1);
  await act(async () => complete(result)); expect(done).toHaveBeenCalledOnce();
});
