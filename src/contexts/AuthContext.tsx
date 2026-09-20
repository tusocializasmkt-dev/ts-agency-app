import { clearLastRoute } from '../app/router/last-route';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  isAdmin: boolean;
  brandId: string | null;
  brandIds: string[];
  isTeamMember: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandIds, setBrandIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const pendingAccessError = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    let authEvent = 0;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const event = ++authEvent;
      setLoading(true);
      setRole(null); setBrandId(null); setBrandIds([]);
      setUser(user);
      setAuthError(user ? null : pendingAccessError.current);
      if (!user) pendingAccessError.current = null;
      try {
        if (user) {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          if (!active || event !== authEvent) return;
          if (adminDoc.exists() && adminDoc.data()?.active === false) {
            pendingAccessError.current = 'Este acesso está desativado. Fale com a agência.';
            clearLastRoute(user.uid); await signOut(auth); return;
          }
          if (adminDoc.exists()) {
            setRole('admin');
            setBrandId(null);
            setBrandIds([]);
          } else {
            const teamDoc = await getDoc(doc(db, 'team_members', user.uid));
            if (!active || event !== authEvent) return;
            if (teamDoc.exists()) {
              const team = teamDoc.data();
              if (team.active === false) {
                setRole(null); setBrandId(null); setBrandIds([]); pendingAccessError.current = 'Este acesso está desativado. Fale com a administradora.'; await signOut(auth);
              } else if (team.role === 'manager' || team.role === 'social_media') {
                setRole(team.role); setBrandId(null); setBrandIds(Array.isArray(team.brandIds) ? team.brandIds.filter((id): id is string => typeof id === 'string') : []);
              } else { setRole(null); setBrandId(null); setBrandIds([]); setAuthError('O perfil da equipe é inválido.'); }
              return;
            }
            const brandDoc = await getDoc(doc(db, 'brands', user.uid));
            if (!active || event !== authEvent) return;
            if (brandDoc.exists() && brandDoc.data().accessEnabled !== false) {
              setRole('client');
              setBrandId(user.uid);
              setBrandIds([user.uid]);
            } else if (brandDoc.exists()) {
              setRole(null);
              setBrandId(null);
              setBrandIds([]);
              pendingAccessError.current = 'Este acesso está desativado. Fale com a agência.';
              await signOut(auth);
            } else {
              setRole(null);
              setBrandId(null);
              setBrandIds([]);
              setAuthError('Sua conta está autenticada, mas ainda não possui um perfil de acesso.');
            }
          }
        } else {
          setRole(null);
          setBrandId(null);
          setBrandIds([]);
        }
      } catch {
        if (!active || event !== authEvent) return;
        setRole(null);
        setBrandId(null);
        setBrandIds([]);
        setAuthError('Não foi possível verificar seu perfil de acesso. Tente novamente.');
      } finally {
        if (active && event === authEvent) setLoading(false);
      }
    });

    return () => { active = false; authEvent += 1; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user || !role) return;
    let active = true;
    const block = () => {
      if (!active) return;
      clearLastRoute(user.uid);
      setRole(null); setBrandIds([]); setBrandId(null);
      pendingAccessError.current = 'Este acesso foi desativado ou revogado. Fale com a agência.';
      void signOut(auth);
    };
    const collection = role === 'admin' ? 'admins' : role === 'client' ? 'brands' : 'team_members';
    const unsubscribe = onSnapshot(doc(db, collection, user.uid), snapshot => {
      if (!active) return;
      const data = snapshot.data();
      if (!snapshot.exists() || (role === 'client' ? data?.accessEnabled === false : data?.active === false)) { block(); return; }
      if (role === 'manager' || role === 'social_media') {
        if (!['manager', 'social_media'].includes(data?.role)) { block(); return; }
        setRole(data!.role);
        setBrandIds(Array.isArray(data?.brandIds) ? data.brandIds.filter((id: unknown): id is string => typeof id === 'string') : []);
      }
    }, block);
    const validate = () => {
      if (document.visibilityState === 'hidden') return;
      void user.getIdToken(true).catch(error => {
        if (['auth/user-disabled', 'auth/user-token-expired', 'auth/invalid-user-token', 'auth/user-not-found'].includes(error?.code)) block();
      });
    };
    window.addEventListener('focus', validate);
    const timer = window.setInterval(validate, 60_000);
    validate();
    return () => { active = false; unsubscribe(); window.removeEventListener('focus', validate); window.clearInterval(timer); };
  }, [user, role]);

  return (
    <AuthContext.Provider value={{
      user,
      role,
      loading,
      isAdmin: role === 'admin',
      brandId,
      brandIds,
      isTeamMember: role === 'manager' || role === 'social_media',
      authError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
