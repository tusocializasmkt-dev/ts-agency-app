import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ShowcaseView from '../components/Client/ShowcaseView';
import { useBrandShowcase } from '../hooks';

vi.mock('../hooks', () => ({ useBrandShowcase: vi.fn() }));
const mockedHook = vi.mocked(useBrandShowcase);

describe('área Clientes do portal', () => {
  beforeEach(() => mockedHook.mockReturnValue({ clients: [], loading: false, error: null }));

  it('mostra somente logo e nome em cards não clicáveis', () => {
    mockedHook.mockReturnValue({ clients: [{ id: 'a', displayName: 'Finoclima', logoUrl: 'https://logo.test/fino.png' }, { id: 'b', displayName: 'ABG' }], loading: false, error: null });
    const { container } = render(<ShowcaseView />);
    expect(screen.getByRole('heading', { name: 'Clientes TuSocializas' })).toBeInTheDocument();
    expect(screen.getByText('Marcas que fazem parte da nossa história.')).toBeInTheDocument();
    expect(screen.getByAltText('Logo Finoclima')).toHaveAttribute('src', 'https://logo.test/fino.png');
    expect(screen.getByText('ABG')).toBeInTheDocument();
    expect(container.querySelectorAll('article')).toHaveLength(2);
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).not.toMatch(/status|financeiro|telefone|responsável|ativo|suspenso|vitrine/i);
  });

  it('mostra loading, estado vazio e erro amigável', () => {
    mockedHook.mockReturnValue({ clients: [], loading: true, error: null });
    const { rerender } = render(<ShowcaseView />);
    expect(screen.getByLabelText('Carregando clientes')).toBeInTheDocument();
    mockedHook.mockReturnValue({ clients: [], loading: false, error: null });
    rerender(<ShowcaseView />);
    expect(screen.getByText('Nossa lista de clientes está sendo preparada.')).toBeInTheDocument();
    mockedHook.mockReturnValue({ clients: [], loading: false, error: 'Não foi possível carregar os clientes agora.' });
    rerender(<ShowcaseView />);
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os clientes agora.');
  });
});
