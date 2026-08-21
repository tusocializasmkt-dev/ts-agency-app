import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const library = vi.hoisted(() => ({ useMediaLibrary: vi.fn() }));
vi.mock('../hooks/useMediaLibrary', () => ({ useMediaLibrary: library.useMediaLibrary }));
import MediaPicker from '../components/media/MediaPicker';
const assets = Array.from({ length: 11 }, (_, index) => ({ id: `m${index}`, brandId: 'brand', originalFileName: `Foto ${index}.jpg`, mediaType: 'image', status: 'ready' }));

describe('MediaPicker', () => {
  beforeEach(() => library.useMediaLibrary.mockReturnValue({ media: assets, loading: false, error: null, setFilters: vi.fn(), refresh: vi.fn() }));
  it('filtra pela marca e seleciona/confirma', () => { const confirm = vi.fn(); render(<MediaPicker brandId="brand" selectedIds={[]} onConfirm={confirm} onCancel={vi.fn()} />); expect(library.useMediaLibrary).toHaveBeenCalledWith('brand'); fireEvent.click(screen.getByRole('button', { name: /Foto 0/ })); expect(screen.getByRole('button', { name: /Foto 0/ })).toHaveAttribute('aria-pressed', 'true'); fireEvent.click(screen.getByRole('button', { name: /confirmar seleção/i })); expect(confirm).toHaveBeenCalledWith(['m0']); });
  it('respeita limite', () => { render(<MediaPicker brandId="brand" selectedIds={assets.slice(0, 10).map(item => item.id)} onConfirm={vi.fn()} onCancel={vi.fn()} />); fireEvent.click(screen.getByRole('button', { name: /Foto 10/ })); expect(screen.getByRole('alert')).toHaveTextContent('no máximo 10'); });
  it('cancela sem confirmar', () => { const cancel = vi.fn(); const confirm = vi.fn(); render(<MediaPicker brandId="brand" selectedIds={[]} onConfirm={confirm} onCancel={cancel} />); fireEvent.click(screen.getByRole('button', { name: 'Cancelar' })); expect(cancel).toHaveBeenCalled(); expect(confirm).not.toHaveBeenCalled(); });
});
