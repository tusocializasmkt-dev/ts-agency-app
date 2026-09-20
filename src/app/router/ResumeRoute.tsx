import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { UserRole } from '../../types';
import { allowedRoute, dashboardFor, lastRoute } from './last-route';
import { AuthLoading } from './ProtectedRoute';

export default function ResumeRoute({ uid, role, brandIds = [], requested }: { uid: string; role: UserRole; brandIds?: string[]; requested?: string }) {
  const target = requested && allowedRoute(requested, role, brandIds) ? requested : lastRoute(uid, role, brandIds);
  const [destination, setDestination] = useState<{ key: string; path: string }>();
  const key = `${uid}:${role}:${target}`;
  useEffect(() => {
    let active = true;
    const brand = /^\/admin\/clientes\/([^/]+)$/.exec(target);
    if (!brand) { setDestination({ key, path: target }); return; }
    setDestination(undefined);
    import('../../services/brands.service').then(({ loadBrand }) => loadBrand(brand[1], role === 'manager' || role === 'social_media')).then(() => { if (active) setDestination({ key, path: target }); }, () => { if (active) setDestination({ key, path: dashboardFor(role) }); });
    return () => { active = false; };
  }, [target, role, key]);
  return destination?.key === key ? <Navigate to={destination.path} replace /> : <AuthLoading />;
}
