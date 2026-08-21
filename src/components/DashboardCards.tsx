import React from 'react';
import { Brand } from '../types';
import { Users, Clock, AlertTriangle } from 'lucide-react';
import { useInvoices, usePosts } from '../hooks';

interface DashboardCardsProps {
  brands: Brand[];
}

const DashboardCards: React.FC<DashboardCardsProps> = ({ brands }) => {
  const { posts: pendingPosts } = usePosts({ status: 'pending' });
  const { invoices: overdueInvoices } = useInvoices(null, 'overdue');

  const stats = [
    { label: 'Clientes Ativos', value: brands.filter(b => b.status === 'active').length, icon: Users, color: 'text-white' },
    { label: 'Posts Pendentes', value: pendingPosts.length, icon: Clock, color: 'text-orange-500' },
    { label: 'Faturas em Atraso', value: overdueInvoices.length, icon: AlertTriangle, color: 'text-red-500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white border border-zinc-200 p-8 rounded-3xl flex items-center justify-between group hover:border-black transition-all shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2">{stat.label}</p>
            <p className={cn("text-3xl font-bold font-mono tracking-tighter", stat.color.replace('text-white', 'text-black'))}>{stat.value}</p>
          </div>
          <div className={cn("p-4 rounded-2xl bg-zinc-50 group-hover:bg-black group-hover:text-white transition-all", stat.color.replace('text-white', 'text-zinc-400'))}>
            <stat.icon className="w-6 h-6" />
          </div>
        </div>
      ))}
    </div>
  );
};

import { cn } from '../lib/utils';
export default DashboardCards;
