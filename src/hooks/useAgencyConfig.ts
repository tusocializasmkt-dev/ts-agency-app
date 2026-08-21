import { useCallback, useEffect, useState } from 'react';
import type { AgencyConfig } from '../types';
import { saveAgencyConfig, watchAgencyConfig } from '../services';

const emptyConfig: AgencyConfig = { name: '', logoUrl: '', phone: '', email: '', socialLinks: {} };

export function useAgencyConfig() {
  const [config, setConfig] = useState<AgencyConfig>(emptyConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => watchAgencyConfig(data => { setConfig(data); setLoading(false); }, () => { setError('Não foi possível carregar as configurações.'); setLoading(false); }), []);
  const save = useCallback(async (data: AgencyConfig) => { setError(null); try { await saveAgencyConfig(data); } catch (cause) { setError('Não foi possível salvar as configurações.'); throw cause; } }, []);
  return { config, setConfig, loading, error, save, resetError: () => setError(null) };
}
