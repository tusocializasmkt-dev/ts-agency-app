import { motion } from 'motion/react';
import { useBrandShowcase } from '../../hooks';

export default function ShowcaseView() {
  const { clients, loading, error } = useBrandShowcase();

  return <div className="mx-auto max-w-6xl space-y-10 py-10">
    <header className="space-y-3 text-center">
      <h2 className="text-4xl font-black tracking-tighter text-black sm:text-5xl">Clientes</h2>
      <p className="text-base text-zinc-500 sm:text-lg">Marcas que fazem parte da nossa história.</p>
    </header>
    {loading ? <div aria-label="Carregando clientes" className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">{Array.from({ length: 10 }, (_, index) => <div key={index} className="mx-auto h-24 w-24 animate-pulse rounded-full bg-zinc-100 md:h-[110px] md:w-[110px]" />)}</div>
      : error ? <p role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-700">{error}</p>
      : clients.length === 0 ? <p className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-zinc-500">Nossa lista de clientes está sendo preparada.</p>
      : <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">{clients.map((client, index) => <motion.article key={client.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="flex min-w-0 flex-col items-center gap-3 text-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-4 ring-1 ring-zinc-100 md:h-[110px] md:w-[110px]">{client.logoUrl ? <img src={client.logoUrl} alt={`Logo ${client.displayName}`} className="h-full w-full object-contain" referrerPolicy="no-referrer" /> : <span aria-hidden="true" className="text-4xl font-black text-black">{client.displayName.charAt(0).toUpperCase()}</span>}</div>
        <span className="w-full break-words text-sm font-semibold leading-snug text-zinc-600" title={client.displayName}>{client.displayName}</span>
      </motion.article>)}</div>}
  </div>;
}
