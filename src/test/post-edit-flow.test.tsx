import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirebaseError } from 'firebase/app';
import { Timestamp } from 'firebase/firestore';

const sdk = vi.hoisted(() => ({ getDoc: vi.fn(), updateDoc: vi.fn() }));
const media = vi.hoisted(() => ({ loadMediaByIds: vi.fn() }));
vi.mock('firebase/firestore', async importOriginal => ({
  ...await importOriginal<typeof import('firebase/firestore')>(),
  ...sdk,
  collection: vi.fn((_db, name) => name),
  doc: vi.fn((_db, name, id) => `${name}/${id}`),
}));
vi.mock('../lib/firebase', () => ({ db: {} }));
vi.mock('../data/repositories', async () => ({
  ...await import('../data/repositories/posts.repository'),
  ...await import('../data/repositories/post-history.repository'),
}));
vi.mock('../services/media.service', () => media);
vi.mock('../services/notifications.service', () => ({}));
vi.mock('../components/ai/PostAiAssistant', () => ({ default: () => null }));
vi.mock('../components/media', () => ({ MediaPicker: () => null }));

import PostModal from '../components/Admin/PostModal';
import { mapPost } from '../data/mappers/post.mapper';
import { editPost } from '../services/posts.service';
import { PersistenceError } from '../data/firebase/firestore.errors';

const original = {
  brandId: 'brand', type: 'carousel', socialNetwork: 'instagram', status: 'approved',
  caption: 'Legenda original', scheduledDate: '2026-10-21T17:00:00.000Z',
  objective: 'venda', mediaIds: ['second', 'first'], coverMediaId: 'first',
  mediaUrls: ['https://example.test/legacy.png'], feedback: '',
  createdAt: Timestamp.fromMillis(1000), updatedAt: Timestamp.fromMillis(2000),
  approvedAt: Timestamp.fromMillis(3000), published: true,
  publishedAt: Timestamp.fromMillis(4000), publishedBy: 'admin',
};
const snapshot = () => ({ id: 'post', exists: () => true, data: () => original });
const actor = { actorUid: 'admin', actorRole: 'admin' as const };

function openEditor() {
  return render(<PostModal post={mapPost(snapshot() as never)} onClose={vi.fn()}
    onSave={data => editPost('post', data, actor)} />);
}

describe('edição: formulário, serviço, mapper e repositório reais', () => {
  beforeEach(() => {
    sdk.getDoc.mockResolvedValue(snapshot());
    sdk.updateDoc.mockResolvedValue(undefined);
    media.loadMediaByIds.mockImplementation(async (ids: string[]) => ids.map(id => ({
      id, brandId: 'brand', mediaType: 'image', originalFileName: `${id}.png`,
    })));
  });

  it.each(['caption', 'scheduledDate'])('envia alteração de %s sem sobrescrever os demais campos', async field => {
    const { container } = openEditor();
    await screen.findByText('1. second.png');
    const changes = field === 'caption' ? { caption: 'Legenda revisada' } : { scheduledDate: '2026-10-29T02:30:00.000Z' };
    if (field === 'caption') fireEvent.change(screen.getByRole('textbox'), { target: { value: changes.caption } });
    else fireEvent.change(container.querySelector('input[type="datetime-local"]')!, { target: { value: '2026-10-28T23:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(sdk.updateDoc).toHaveBeenCalledTimes(1));
    const [reference, payload] = sdk.updateDoc.mock.calls[0];
    expect(reference).toBe('posts/post');
    expect(payload.updatedAt).toBeDefined();
    expect(payload).not.toHaveProperty('id');
    for (const key of ['published', 'publishedAt', 'publishedBy']) expect(payload).not.toHaveProperty(key);
    const { updatedAt, ...content } = { ...original, ...payload };
    const { updatedAt: previousUpdate, ...expected } = original;
    expect(content).toEqual({ ...expected, ...changes });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    ['media', 'get-by-ids', 'permission-denied'],
    ['post', 'get', 'unavailable'],
    ['post', 'update', 'invalid-argument'],
    ['post', 'update', 'permission-denied'],
  ])('identifica falha em %s/%s (%s), sem expor conteúdo', async (entity, operation, code) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    openEditor();
    await screen.findByText('1. second.png');
    const originalError = new FirebaseError(code, 'Detalhe privado com legenda e URL');
    if (entity === 'media') media.loadMediaByIds.mockRejectedValueOnce(new PersistenceError(
      'Não foi possível concluir a operação de dados.', operation, entity, originalError, code,
    ));
    else if (operation === 'get') sdk.getDoc.mockRejectedValueOnce(originalError);
    else sdk.updateDoc.mockRejectedValueOnce(originalError);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Legenda revisada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir a operação de dados.');
    expect(log).toHaveBeenCalledExactlyOnceWith('post_save_failed', { operation, entity, code });
    expect(log.mock.calls.flat()).not.toContain(originalError);
    expect(screen.queryByText(/Detalhe privado/)).not.toBeInTheDocument();
    if (operation !== 'update') expect(sdk.updateDoc).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled());
  });
});
