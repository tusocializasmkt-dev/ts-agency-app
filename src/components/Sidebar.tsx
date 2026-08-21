import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../lib/utils';
import { LayoutDashboard, Users, Image as ImageIcon, Images, Calendar as CalendarIcon, DollarSign, TrendingUp, Settings, LogOut, Trash2, Star, Bell } from 'lucide-react';
import { ROUTES } from '../app/router/routes';
import { useNotifications } from '../hooks/useNotifications';

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
];

const clientItems = [
  { to: ROUTES.client.root, label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: ROUTES.client.notifications, label: 'Notificações', icon: Bell },
  { to: ROUTES.client.posts, label: 'Feed', icon: ImageIcon },
  { to: ROUTES.client.calendar, label: 'Calendário', icon: CalendarIcon },
  { to: ROUTES.client.finance, label: 'Financeiro', icon: DollarSign },
  { to: ROUTES.client.metrics, label: 'Insights', icon: TrendingUp },
  { to: ROUTES.client.profile, label: 'Meu Perfil', icon: Settings },
  { to: ROUTES.client.showcase, label: 'Vitrine', icon: Star },
];

export default function Sidebar() {
  const { role } = useAuth();
  const { unreadCount } = useNotifications();
  const menuItems = role === 'admin' ? adminItems : clientItems;
  return (
    <aside className="w-64 border-r border-zinc-200 flex flex-col bg-white overflow-hidden h-screen sticky top-0">
      <div className="p-8"><h1 className="text-xl font-bold tracking-tighter uppercase">TS Agency</h1></div>
      <nav className="flex-1 px-4 space-y-2" aria-label="Navegação principal">
        {menuItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 font-medium',
            isActive ? 'bg-black text-white shadow-xl shadow-black/5 font-bold' : 'text-zinc-500 hover:text-black hover:bg-zinc-100',
          )}>
            <item.icon className="w-4 h-4" />{item.label}{item.label === 'Notificações' && unreadCount > 0 && <span aria-label={`${unreadCount} notificações não lidas`} className="ml-auto rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 mt-auto"><button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors font-bold"><LogOut className="w-4 h-4" />Sair</button></div>
    </aside>
  );
}
