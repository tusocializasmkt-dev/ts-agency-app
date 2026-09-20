import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { rememberRoute } from './last-route';

export default function RememberRoute() {
  const { user, role, brandIds, loading, authError } = useAuth();
  const { pathname } = useLocation();
  useEffect(() => { if (user && role && !loading && !authError) rememberRoute(user.uid, role, pathname, brandIds ?? []); }, [user, role, pathname, loading, authError, brandIds]);
  return null;
}
