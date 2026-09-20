import { useCallback, useEffect, useRef, useState } from 'react';
import { changeAccess, listAdministrators, loadAccess } from '../services/access.service';
import type { AccessCommand, AccessKind, AccessProfile } from '../data/functions/access.functions';
import { useAuth } from '../contexts/AuthContext';

export function useAccessManagement(kind: AccessKind, uid?: string) {
  const { isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++request.current;
    if (!isAdmin) { setProfiles([]); setLoading(false); return; }
    setLoading(true);
    setError('');
    try { const data = uid ? [await loadAccess(kind, uid)] : await listAdministrators(); if (current === request.current) setProfiles(data); }
    catch { if (current === request.current) setError('Não foi possível consultar os acessos. Tente novamente.'); }
    finally { if (current === request.current) setLoading(false); }
  }, [kind, uid, isAdmin]);
  useEffect(() => { setProfiles([]); void refresh(); return () => { request.current++; }; }, [refresh]);
  const run = async (command: Omit<AccessCommand, 'kind'>) => {
    if (!isAdmin) throw new Error('Acesso negado.');
    setProcessing(true);
    try { await changeAccess({ ...command, kind, uid: command.uid ?? uid }); await refresh(); }
    finally { setProcessing(false); }
  };
  return { profiles, loading, processing, error, refresh, run };
}
