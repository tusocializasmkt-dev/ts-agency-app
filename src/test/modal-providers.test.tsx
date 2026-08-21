import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import GlobalModal from '../components/ui/GlobalModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ModalProvider from '../app/providers/ModalProvider';
import FeedbackProvider from '../app/providers/FeedbackProvider';
import { useModal } from '../hooks/useModal';
import { useFeedback } from '../hooks/useFeedback';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(() => 'toast'), { success: vi.fn(() => 'success'), error: vi.fn(() => 'error'), dismiss: vi.fn() }), Toaster: () => <div data-testid="toaster" /> }));

describe('modal e feedback', () => {
  it('GlobalModal implementa diálogo, foco, escape, overlay e restaura scroll/foco', async () => {
    const close = vi.fn(); const user = userEvent.setup();
    const before = document.createElement('button'); document.body.append(before); before.focus();
    const { unmount } = render(<GlobalModal title="Título" onClose={close} showCloseButton={false}><button>Primeiro</button><button>Último</button></GlobalModal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true'); expect(dialog).toHaveAccessibleName('Título');
    expect(dialog).toHaveFocus(); expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}'); expect(close).toHaveBeenCalledTimes(1);
    fireEvent.mouseDown(dialog.parentElement!); expect(close).toHaveBeenCalledTimes(2);
    screen.getByText('Último').focus(); await user.keyboard('{Tab}'); expect(screen.getByText('Primeiro')).toHaveFocus();
    unmount(); expect(document.body.style.overflow).toBe(''); expect(before).toHaveFocus(); before.remove();
  });

  it('respeita bloqueios de fechamento', () => {
    const close = vi.fn();
    render(<GlobalModal onClose={close} closeOnEscape={false} closeOnOverlay={false}>conteúdo</GlobalModal>);
    fireEvent.keyDown(document, { key: 'Escape' }); fireEvent.mouseDown(screen.getByRole('dialog').parentElement!);
    expect(close).not.toHaveBeenCalled();
  });

  it('ConfirmDialog usa labels, cancelamento inicial e bloqueia processamento', () => {
    const confirm = vi.fn(); const cancel = vi.fn();
    const { rerender } = render(<ConfirmDialog options={{ title: 'Excluir', confirmLabel: 'Sim', cancelLabel: 'Não', destructive: true }} onConfirm={confirm} onCancel={cancel} />);
    expect(screen.getByRole('button', { name: 'Não' })).toHaveFocus(); fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' }); expect(confirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sim' })); expect(confirm).toHaveBeenCalled();
    rerender(<ConfirmDialog options={{ title: 'Excluir' }} onConfirm={confirm} onCancel={cancel} processing />);
    expect(screen.getAllByRole('button').every(button => button.hasAttribute('disabled') || button.getAttribute('aria-label'))).toBe(true);
  });

  it('ModalProvider abre, fecha e resolve confirmações', async () => {
    let result: Promise<boolean> | undefined;
    const Probe = () => { const modal = useModal(); return <><button onClick={() => modal.openModal({ title: 'Custom', content: 'corpo' })}>abrir</button><button onClick={() => { result = modal.confirm({ title: 'Confirma?' }); }}>confirmar</button></>; };
    const user = userEvent.setup(); render(<ModalProvider><Probe /></ModalProvider>);
    await user.click(screen.getByText('abrir')); expect(screen.getByText('corpo')).toBeInTheDocument(); await user.click(screen.getByLabelText(/fechar/i));
    await user.click(screen.getByText('confirmar')); await user.click(screen.getByText('Cancelar')); await expect(result).resolves.toBe(false);
    await user.click(screen.getByText('confirmar')); await user.click(screen.getByText('Confirmar')); await expect(result).resolves.toBe(true);
  });

  it('FeedbackProvider delega tipos e dismiss ao toast', () => {
    const Probe = () => { const feedback = useFeedback(); return <button onClick={() => { feedback.success('ok'); feedback.error('erro'); feedback.warning('atenção'); feedback.info('info'); feedback.dismiss('x'); feedback.dismissAll(); }}>agir</button>; };
    render(<FeedbackProvider><Probe /></FeedbackProvider>); fireEvent.click(screen.getByText('agir'));
    expect(toast.success).toHaveBeenCalled(); expect(toast.error).toHaveBeenCalled(); expect(toast).toHaveBeenCalledTimes(2); expect(toast.dismiss).toHaveBeenCalledTimes(2); expect(screen.getAllByTestId('toaster')).toHaveLength(1);
  });
});
