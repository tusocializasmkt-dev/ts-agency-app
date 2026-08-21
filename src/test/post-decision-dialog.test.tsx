import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PostDecisionDialog from '../components/posts/PostDecisionDialog';

describe('PostDecisionDialog', () => {
  it('exige feedback útil, mostra contador e envia texto normalizado', async () => {
    const confirm = vi.fn().mockResolvedValue(undefined);
    render(<PostDecisionDialog mode="changes" onCancel={vi.fn()} onConfirm={confirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }));
    expect(screen.getByRole('alert')).toHaveTextContent('pelo menos 3');
    fireEvent.change(screen.getByLabelText('Feedback obrigatório'), { target: { value: '  Ajustar título  ' } });
    expect(screen.getByText('18/1000')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledWith('Ajustar título'));
  });

  it('desabilita fechamento e confirmação enquanto processa', () => {
    render(<PostDecisionDialog mode="rejection" processing onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled();
  });
});
