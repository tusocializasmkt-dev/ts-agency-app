import { useCallback, useEffect, useState } from 'react';
import type { TrashItem } from '../types';
import { deleteItemPermanently, restoreItem, watchTrash } from '../services';

export function useTrash() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => watchTrash(data => { setItems(data); setLoading(false); }, () => { setError('Não foi possível carregar a lixeira.'); setLoading(false); }), []);
  const run = useCallback(async (command: () => Promise<void>, message: string) => { setError(null); try { await command(); } catch (cause) { setError(message); throw cause; } }, []);
  return {
    items, loading, error,
    restore: (item: TrashItem) => run(() => restoreItem(item), 'Não foi possível restaurar o post.'),
    removePermanently: (id: string) => run(() => deleteItemPermanently(id), 'Não foi possível excluir o post.'),
    resetError: () => setError(null),
  };
}
