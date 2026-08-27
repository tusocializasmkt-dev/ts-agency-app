import { useAuth } from '../contexts/AuthContext';
import FeedView from './FeedView';
import { Link } from 'react-router-dom';
import { useBrands, useInvoices, useNotifications, usePosts } from '../hooks';
import { BRAND_STATUS_LABELS, getBrandStatusBadgeClass, getBrandStatusRingClass, normalizeBrandStatus } from '../brands/brand-status';
import { ROUTES } from '../app/router/routes';
import { cn } from '../lib/utils';
import { getEffectiveInvoiceStatus } from '../invoices';

export default function ClientDashboard() {
  const { brandId } = useAuth();
  if (!brandId) return <div>Erro: Cliente não identificado.</div>;
  return <ClientDashboardContent brandId={brandId} />;
}

function ClientDashboardContent({ brandId }: { brandId: string }) {
  const { brand } = useBrands(brandId);
  const { posts } = usePosts({ brandId });
  const { invoices } = useInvoices(brandId);
  const { unreadCount } = useNotifications();
  const status = normalizeBrandStatus(brand?.status);
  const pending = posts.filter(post => post.status === 'pending').length;
  const approved = posts.filter(post => post.status === 'approved').length;
  const openInvoices = invoices.filter(invoice => ['pending', 'overdue'].includes(getEffectiveInvoiceStatus(invoice))).length;
  return <div className="space-y-8">
    <section className="flex flex-col gap-5 rounded-3xl border bg-white p-6 sm:flex-row sm:items-center">
      <div className={cn('flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-black text-2xl font-bold text-white ring-4 ring-offset-4', getBrandStatusRingClass(status))}>{brand?.logoUrl ? <img src={brand.logoUrl} alt={`Logotipo de ${brand.name}`} className="h-full w-full object-cover" /> : brand?.name?.charAt(0).toUpperCase() ?? '?'}</div>
      <div><p className="text-sm text-zinc-500">Bem-vindo ao portal da sua empresa</p><h1 className="text-2xl font-bold">{brand?.name ?? 'Sua empresa'}</h1><span className={cn('mt-2 inline-block rounded-full border px-3 py-1 text-sm font-bold', getBrandStatusBadgeClass(status))}>Status da conta: {BRAND_STATUS_LABELS[status]}</span></div>
    </section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo da conta">{[[pending, 'Aguardando aprovação', ROUTES.client.posts], [approved, 'Conteúdos aprovados', ROUTES.client.posts], [unreadCount, 'Notificações não lidas', ROUTES.client.notifications], [openInvoices, 'Cobranças em aberto', ROUTES.client.finance]].map(([value, label, to]) => <Link key={String(label)} to={String(to)} className="rounded-2xl border bg-white p-5 hover:border-black"><strong className="text-3xl">{value}</strong><span className="mt-1 block text-sm text-zinc-500">{label}</span></Link>)}</section>
    <div><div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-2xl font-bold">Seus conteúdos</h2><Link to={ROUTES.client.calendar} className="text-sm font-bold underline">Ver calendário</Link></div><FeedView selectedBrandId={brandId} isAdmin={false} /></div>
  </div>;
}
