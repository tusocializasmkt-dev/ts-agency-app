import { useEffect, useState } from 'react';
import type { PostDecisionHistory } from '../types';
import { watchPostDecisionHistory } from '../services/posts.service';

export function usePostDecisionHistory(postId: string, enabled = true) {
  const [history, setHistory] = useState<PostDecisionHistory[]>([]); const [loading, setLoading] = useState(enabled); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!enabled) { setLoading(false); return; } setLoading(true); setError(null); return watchPostDecisionHistory(postId, items => { setHistory(items); setLoading(false); }, () => { setError('Não foi possível carregar o histórico de aprovação.'); setLoading(false); }); }, [enabled, postId]);
  return { history, loading, error };
}
