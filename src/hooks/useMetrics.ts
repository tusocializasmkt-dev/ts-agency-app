import { useEffect, useState } from 'react';
import type { OrganicMetrics, PaidMetrics } from '../types';
import { saveOrganicMetrics, savePaidMetrics, watchOrganicMetrics, watchPaidMetrics } from '../services';

export function useMetrics(brandId: string | null) {
  const [organic, setOrganic] = useState<OrganicMetrics[]>([]);
  const [paid, setPaid] = useState<PaidMetrics[]>([]);
  const [loading, setLoading] = useState(Boolean(brandId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandId) { setOrganic([]); setPaid([]); setLoading(false); return; }
    setLoading(true); setError(null);
    let organicReady = false; let paidReady = false;
    const ready = () => { if (organicReady && paidReady) setLoading(false); };
    const fail = () => { setError('Não foi possível carregar as métricas.'); setLoading(false); };
    const unsubOrganic = watchOrganicMetrics(brandId, data => { setOrganic(data); organicReady = true; ready(); }, fail);
    const unsubPaid = watchPaidMetrics(brandId, data => { setPaid(data); paidReady = true; ready(); }, fail);
    return () => { unsubOrganic(); unsubPaid(); };
  }, [brandId]);

  const saveOrganic = (data: Parameters<typeof saveOrganicMetrics>[0]) => saveOrganicMetrics(data);
  const savePaid = (data: Parameters<typeof savePaidMetrics>[0]) => savePaidMetrics(data);
  return { organic, paid, loading, error, saveOrganic, savePaid, resetError: () => setError(null) };
}
