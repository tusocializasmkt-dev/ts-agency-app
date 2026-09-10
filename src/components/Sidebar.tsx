import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../lib/utils';
import { LayoutDashboard, Users, UserRoundCog, Image as ImageIcon, Images, Calendar as CalendarIcon, DollarSign, TrendingUp, Settings, LogOut, Trash2, Bell, X } from 'lucide-react';
import { ROUTES } from '../app/router/routes';
import { useNotifications } from '../hooks/useNotifications';
import { useAgencyConfig } from '../hooks/useAgencyConfig';

const adminItems = [
  { to: ROUTES.admin.root, label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: ROUTES.admin.notifications, label: 'Notificações', icon: Bell },
  { to: ROUTES.admin.posts, label: 'Feed', icon: ImageIcon },
  { to: ROUTES.admin.calendar, label: 'Calendário', icon: CalendarIcon },
  { to: ROUTES.admin.finance, label: 'Financeiro', icon: DollarSign },
  { to: ROUTES.admin.metrics, label: 'Insights', icon: TrendingUp },
  { to: ROUTES.admin.clients, label: 'Clientes', icon: Users },
  { to: ROUTES.admin.media, label: 'Mídias', icon: Images },
  { to: ROUTES.admin.trash, label: 'Lixeira', icon: Trash2 },
  { to: ROUTES.admin.settings, label: 'Configurações', icon: Settings },
  { to: ROUTES.admin.team, label: 'Equipe', icon: UserRoundCog },
];

const teamItems = adminItems.filter(item => ['Dashboard', 'Notificações', 'Feed', 'Calendário', 'Insights', 'Clientes', 'Mídias'].includes(item.label));

const clientItems = [
  { to: ROUTES.client.root, label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: ROUTES.client.notifications, label: 'Notificações', icon: Bell },
  { to: ROUTES.client.posts, label: 'Feed', icon: ImageIcon },
  { to: ROUTES.client.calendar, label: 'Calendário', icon: CalendarIcon },
  { to: ROUTES.client.media, label: 'Mídias', icon: Images },
  { to: ROUTES.client.finance, label: 'Financeiro', icon: DollarSign },
  { to: ROUTES.client.metrics, label: 'Insights', icon: TrendingUp },
  { to: ROUTES.client.profile, label: 'Minha Empresa', icon: Settings },
  { to: ROUTES.client.showcase, label: 'Clientes', icon: Users },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const { role } = useAuth();
  const { unreadCount } = useNotifications();
  const { config } = useAgencyConfig();
  const location = useLocation();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuItems = role === 'admin' ? adminItems : role === 'manager' || role === 'social_media' ? teamItems : clientItems;

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onMobileClose?.();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileOpen, onMobileClose]);

  useEffect(() => {
    if (mobileOpen) onMobileClose?.();
    // A mudança de rota deve sempre recolher o drawer, inclusive por navegação programática.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <>
      <button type="button" aria-label="Fechar menu" tabIndex={mobileOpen ? 0 : -1} onClick={onMobileClose} className={`fixed inset-0 z-40 bg-black/45 transition-opacity lg:hidden ${mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`} />
      <aside id="authenticated-navigation" aria-label="Menu lateral" className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[85vw] flex-col overflow-hidden border-r border-zinc-200 bg-white shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex min-h-24 items-center gap-3 p-6">{config.logoUrl ? <div className="min-w-0 flex-1"><img src={config.logoUrl} alt={config.name ? `Logotipo ${config.name}` : 'Logotipo da agência'} className="max-h-14 w-full object-contain object-left" />{config.name && <span className="mt-2 block truncate text-xs font-bold uppercase tracking-wider text-zinc-500">{config.name}</span>}</div> : <h1 className="min-w-0 flex-1 text-xl font-bold tracking-tighter uppercase">TS Agency</h1>}<button ref={closeButtonRef} type="button" aria-label="Fechar menu de navegação" onClick={onMobileClose} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black lg:hidden"><X className="h-5 w-5" /></button></div>
      <nav className="flex-1 space-y-2 overflow-y-auto px-4 pb-4" aria-label="Navegação principal">
        {menuItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} onClick={onMobileClose} className={({ isActive }) => cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 font-medium',
            isActive ? 'bg-black text-white shadow-xl shadow-black/5 font-bold' : 'text-zinc-500 hover:text-black hover:bg-zinc-100',
          )}>
            <item.icon className="w-4 h-4" />{item.label}{item.label === 'Notificações' && unreadCount > 0 && <span aria-label={`${unreadCount} notificações não lidas`} className="ml-auto rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto p-4"><button onClick={() => signOut(auth)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-red-500 transition-colors hover:bg-red-50"><LogOut className="h-4 w-4" />Sair</button></div>
      </aside>
    </>
  );
}
