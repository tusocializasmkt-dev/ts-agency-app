import { useCallback, useRef, useState } from 'react';
import { callMarketingAssistant, type MarketingAiRequest } from '../data/functions/marketing-ai.functions';

const friendlyError = (cause: unknown) => {
  const code = typeof cause === 'object' && cause && 'code' in cause ? String(cause.code) : '';
  if (code.includes('permission-denied')) return 'Você não tem permissão para usar a IA neste cliente.';
  if (code.includes('resource-exhausted')) return 'Muitas solicitações em pouco tempo. Aguarde um minuto.';
  if (code.includes('invalid-argument')) return 'Confira o conteúdo e tente novamente.';
  return 'Não foi possível gerar o conteúdo agora. Tente novamente.';
};

export function useMarketingAI() {
  const request = useRef(0);
  const [loading, setLoading] = useState(false); const [result, setResult] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (input: MarketingAiRequest) => {
    const id = ++request.current; setLoading(true); setError(null);
    try { const response = await callMarketingAssistant(input); if (id === request.current) setResult(response.text); return response.text; }
    catch (cause) { if (id === request.current) setError(friendlyError(cause)); return null; }
    finally { if (id === request.current) setLoading(false); }
  }, []);
  const cancel = useCallback(() => { request.current += 1; setLoading(false); }, []);
  const clear = useCallback(() => { request.current += 1; setLoading(false); setResult(null); setError(null); }, []);
  return { loading, result, error, run, cancel, clear };
}
