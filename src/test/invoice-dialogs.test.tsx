import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const upload = vi.hoisted(() => ({ items: [], isUploading: false, clearAll: vi.fn(), enqueue: vi.fn(), start: vi.fn(), cancel: vi.fn(), retry: vi.fn() }));
vi.mock('../hooks/useMediaUpload', () => ({ useMediaUpload: () => upload }));

import InvoiceDialog from '../components/finance/InvoiceDialog';
import PaymentPromiseDialog from '../components/finance/PaymentPromiseDialog';
import PromiseReviewDialog from '../components/finance/PromiseReviewDialog';

describe('dialogs financeiros', () => {
  it('cria fatura com os campos administrativos obrigatórios', async () => {
    const confirm = vi.fn().mockResolvedValue(undefined);
    render(<InvoiceDialog brands={[{ id: 'b', name: 'Marca' } as never]} processing={false} onCancel={vi.fn()} onConfirm={confirm} />);
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'b' } });
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Mensalidade' } });
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '120,50' } });
    fireEvent.change(screen.getByLabelText('Vencimento'), { target: { value: '2026-08-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await vi.waitFor(() => expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ brandId: 'b', description: 'Mensalidade', amount: 120.5, dueDate: '2026-08-20' }), undefined));
  });

  it('valida PDF antes de iniciar o uploader reutilizado', () => {
    render(<InvoiceDialog brands={[{ id: 'b', name: 'Marca' } as never]} processing={false} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'b' } });
    fireEvent.change(screen.getByLabelText('Boleto manual em PDF'), { target: { files: [new File(['x'], 'boleto.txt', { type: 'text/plain' })] } });
    expect(screen.getByRole('alert')).toHaveTextContent('PDF');
    expect(upload.enqueue).not.toHaveBeenCalled();
  });

  it('valida promessa e reprovação antes de confirmar', async () => {
    const promiseConfirm = vi.fn().mockResolvedValue(undefined);
    const first = render(<PaymentPromiseDialog maxDate="2026-08-20" processing={false} onCancel={vi.fn()} onConfirm={promiseConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' })); expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Data pretendida'), { target: { value: '2026-08-15' } }); fireEvent.change(screen.getByLabelText('Justificativa'), { target: { value: 'Pagamento no dia 15' } }); fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await vi.waitFor(() => expect(promiseConfirm).toHaveBeenCalledWith('2026-08-15', 'Pagamento no dia 15')); first.unmount();
    const reject = vi.fn().mockResolvedValue(undefined); render(<PromiseReviewDialog processing={false} onCancel={vi.fn()} onConfirm={reject} />); fireEvent.change(screen.getByLabelText('Observação'), { target: { value: 'ok' } }); fireEvent.click(screen.getByRole('button', { name: 'Reprovar' })); expect(screen.getByRole('alert')).toHaveTextContent('3 caracteres');
  });
});
