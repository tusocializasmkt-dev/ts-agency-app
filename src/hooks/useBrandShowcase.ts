import { useEffect, useState } from 'react';
import type { BrandShowcaseItem } from '../types';
import { watchBrandShowcase } from '../services';

export function useBrandShowcase() {
  const [clients, setClients] = useState<BrandShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => watchBrandShowcase(items => {
    setClients(items);
    setError(null);
    setLoading(false);
  }, () => {
    setError('Não foi possível carregar os clientes agora.');
    setLoading(false);
  }), []);

  return { clients, loading, error };
}
