import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const service = vi.hoisted(() => ({ loadMediaByIds: vi.fn() }));
vi.mock('../services/media.service', () => service);
vi.mock('../components/media/MediaPicker', () => ({ default: ({ onConfirm, onCancel }: { onConfirm: (ids: string[]) => void; onCancel: () => void }) => <div><button onClick={() => onConfirm(['m1', 'm2', 'm3'])}>Escolher três</button><button onClick={onCancel}>Cancelar picker</button></div> }));
import PostModal from '../components/Admin/PostModal';
const assets = ['m1', 'm2', 'm3'].map((id, index) => ({ id, brandId: 'b', originalFileName: `Mídia ${index + 1}`, mediaType: index === 2 ? 'video' : 'image', downloadUrl: `https://example.test/${id}` }));

describe('PostModal media integration', () => {
  beforeEach(() => service.loadMediaByIds.mockImplementation(async (ids: string[] = []) => assets.filter(asset => ids.includes(asset.id))));
  it('seleciona, remove, ordena, define capa e salva', async () => { const save = vi.fn(); render(<PostModal brandId="b" onClose={vi.fn()} onSave={save} />); fireEvent.click(screen.getByRole('button', { name: /selecionar da biblioteca/i })); fireEvent.click(screen.getByText('Escolher três')); await screen.findByText(/Mídia 1/); fireEvent.click(screen.getByRole('button', { name: 'Mover 2 para esquerda' })); fireEvent.click(screen.getByRole('button', { name: 'Definir mídia 3 como capa' })); fireEvent.click(screen.getByRole('button', { name: 'Remover mídia 2' })); fireEvent.click(screen.getByRole('button', { name: 'Criar post' })); await waitFor(() => expect(save).toHaveBeenCalled()); const payload = save.mock.calls[0][0]; expect(payload.brandId).toBe('b'); expect(payload.mediaIds).toEqual(['m2', 'm3']); expect(payload.coverMediaId).toBe('m3'); });
  it('carrega seleção, ordem e capa ao editar', async () => { render(<PostModal brandId="b" post={{ id: 'p', brandId: 'b', type: 'feed', socialNetwork: 'instagram', caption: '', scheduledDate: new Date().toISOString(), status: 'pending', mediaIds: ['m2', 'm1'], coverMediaId: 'm1' }} onClose={vi.fn()} onSave={vi.fn()} />); await screen.findByText(/1\. Mídia 2/); expect(screen.getByText('Capa do post')).toBeInTheDocument(); });
  it('preserva preview legado enquanto não substituído', () => { render(<PostModal brandId="b" post={{ id: 'p', brandId: 'b', type: 'feed', socialNetwork: 'instagram', caption: '', scheduledDate: new Date().toISOString(), status: 'pending', mediaUrl: 'https://example.test/legacy.jpg' }} onClose={vi.fn()} onSave={vi.fn()} />); expect(screen.getByText('Mídia legada preservada')).toBeInTheDocument(); expect(screen.getByAltText('Mídia legada 1')).toBeInTheDocument(); });
});
