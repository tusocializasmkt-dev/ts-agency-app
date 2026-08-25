import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PostModal from '../components/Admin/PostModal';

const aiState = { loading: false, result: null as string | null, error: null as string | null, run: vi.fn(), cancel: vi.fn(), clear: vi.fn() };
vi.mock('../hooks/useMarketingAI', () => ({ useMarketingAI: () => aiState }));

describe('assistente de IA no post', () => {
  beforeEach(() => { aiState.loading = false; aiState.result = null; aiState.error = null; });
  it.each(['admin', 'gerente autorizado'])('aparece quando %s possui permissão', () => {
    render(<PostModal aiEnabled brandId="b" onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByLabelText('Assistente de IA')).toBeInTheDocument();
  });
  it('não aparece para cliente', () => {
    render(<PostModal brandId="b" onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.queryByLabelText('Assistente de IA')).not.toBeInTheDocument();
  });
  it('mostra loading e permite cancelar', () => {
    aiState.loading = true;
    render(<PostModal aiEnabled brandId="b" onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Gerando sugestão');
    fireEvent.click(within(screen.getByLabelText('Assistente de IA')).getByRole('button', { name: 'Cancelar' })); expect(aiState.cancel).toHaveBeenCalled();
  });
  it('exibe sugestão sem substituir e só aplica após confirmação', () => {
    aiState.result = 'Legenda sugerida';
    render(<PostModal aiEnabled brandId="b" onClose={vi.fn()} onSave={vi.fn()} />);
    const caption = screen.getByRole('textbox', { name: /legenda/i });
    expect(caption).toHaveValue(''); expect(screen.getByText('Legenda sugerida')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /usar esta versão/i })); expect(caption).toHaveValue('Legenda sugerida');
  });
  it('cancelar sugestão preserva o texto original', () => {
    aiState.result = 'Outra versão';
    render(<PostModal aiEnabled brandId="b" onClose={vi.fn()} onSave={vi.fn()} />);
    const caption = screen.getByRole('textbox', { name: /legenda/i }); fireEvent.change(caption, { target: { value: 'Original' } });
    fireEvent.click(within(screen.getByLabelText('Assistente de IA')).getByRole('button', { name: 'Cancelar' })); expect(caption).toHaveValue('Original'); expect(aiState.clear).toHaveBeenCalled();
  });
  it('mostra erro amigável', () => {
    aiState.error = 'Não foi possível gerar o conteúdo agora. Tente novamente.';
    render(<PostModal aiEnabled brandId="b" onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível gerar');
  });
});
