import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MediaFilters from '../components/media/MediaFilters';
import MediaPagination from '../components/media/MediaPagination';

describe('MediaFilters', () => {
  it('altera cliente, tipo e status e limpa', () => { const onChange = vi.fn(); const onClear = vi.fn(); render(<MediaFilters brands={[{ id: 'b', name: 'Marca B' } as never]} filters={{ order: 'newest' }} onChange={onChange} onClear={onClear} />); fireEvent.change(screen.getByLabelText('Filtrar por cliente'), { target: { value: 'b' } }); expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ brandId: 'b' })); fireEvent.change(screen.getByLabelText('Filtrar por tipo'), { target: { value: 'image' } }); expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: 'image' })); fireEvent.change(screen.getByLabelText('Filtrar por status'), { target: { value: 'deleted' } }); expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'deleted' })); fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' })); expect(onClear).toHaveBeenCalled(); });
});

describe('MediaPagination', () => {
  it('aciona anterior e próxima', () => { const previous = vi.fn(); const next = vi.fn(); render(<MediaPagination page={2} hasPreviousPage hasNextPage onPrevious={previous} onNext={next} />); fireEvent.click(screen.getByRole('button', { name: /anterior/i })); fireEvent.click(screen.getByRole('button', { name: /próxima/i })); expect(previous).toHaveBeenCalled(); expect(next).toHaveBeenCalled(); expect(screen.getByText('Página 2')).toHaveAttribute('aria-current', 'page'); });
  it('desabilita limites', () => { render(<MediaPagination page={1} hasPreviousPage={false} hasNextPage={false} onPrevious={vi.fn()} onNext={vi.fn()} />); expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled(); expect(screen.getByRole('button', { name: /próxima/i })).toBeDisabled(); });
});
