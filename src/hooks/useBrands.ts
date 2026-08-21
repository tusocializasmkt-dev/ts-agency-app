import { useCallback, useEffect, useState } from 'react';
import type { Brand } from '../types';
import { addBrand, loadBrand, saveBrand, saveClientProfile, watchBrands } from '../services';
import type { ClientEditableBrandFields } from '../data/repositories';

export function useBrands(brandId?: string, enabled = true) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    setLoading(true); setError(null);
    if (!brandId) return watchBrands(data => { setBrands(data); setLoading(false); }, () => { setError('Não foi possível carregar os clientes.'); setLoading(false); });
    let active = true;
    loadBrand(brandId).then(data => { if (active) { setBrand(data); setLoading(false); } }).catch(() => { if (active) { setError('Não foi possível carregar o cliente.'); setLoading(false); } });
    return () => { active = false; };
  }, [brandId, enabled]);

  const update = useCallback(async (id: string, data: Partial<Brand>) => {
    setError(null);
    try { await saveBrand(id, data); }
    catch (cause) { setError('Não foi possível salvar o cliente.'); throw cause; }
  }, []);

  const updateClientProfile = useCallback(async (id: string, data: ClientEditableBrandFields) => {
    setError(null);
    try { await saveClientProfile(id, data); }
    catch (cause) { setError('Não foi possível salvar o perfil.'); throw cause; }
  }, []);

  const create = useCallback(async (data: Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>) => {
    setError(null);
    try { return await addBrand(data); }
    catch (cause) { setError('Não foi possível criar o cliente.'); throw cause; }
  }, []);

  return { brands, brand, loading, error, create, update, updateClientProfile, resetError: () => setError(null) };
}
