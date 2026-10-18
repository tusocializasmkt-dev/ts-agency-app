import { useEffect, useState } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
export function useEditorPermission(permission: 'appearanceEditor' | 'communicationsEditor') {
  const { isAdmin, user } = useAuth();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let active = true;
    setAllowed(false);
    const stop = onIdTokenChanged(auth, async current => {
      setAllowed(false);
      if (!current || current.uid !== user?.uid || !isAdmin) return;
      try { const token = await current.getIdTokenResult(); if (active) setAllowed(token.claims.admin === true && token.claims[permission] === true); } catch { /* Deny on token errors. */ }
    });
    return () => { active = false; stop(); };
  }, [isAdmin, user?.uid, permission]);
  return allowed;
}
