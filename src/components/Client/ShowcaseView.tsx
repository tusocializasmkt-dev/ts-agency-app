import { motion } from 'motion/react';
import { useBrandShowcase } from '../../hooks';

export default function ShowcaseView() {
  const { clients, loading, error } = useBrandShowcase();

  return <div className="mx-auto max-w-6xl space-y-10 py-10">
    <header className="space-y-3 text-center">
      <h2 className="text-4xl font-black tracking-tighter text-black sm:text-5xl">Clientes TuSocializas</h2>
      <p className="text-base text-zinc-500 sm:text-lg">Marcas que fazem parte da nossa história.</p>
    </header>
    {loading ? <div aria-label="Carregando clientes" className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">{Array.from({ length: 10 }, (_, index) => <div key={index} className="aspect-square animate-pulse rounded-3xl bg-zinc-100" />)}</div>
      : error ? <p role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-700">{error}</p>
      : clients.length === 0 ? <p className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-zinc-500">Nossa lista de clientes está sendo preparada.</p>
      : <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">{clients.map((client, index) => <motion.article key={client.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="flex aspect-square min-w-0 flex-col items-center justify-center gap-4 rounded-3xl border border-zinc-100 bg-white p-5 text-center shadow-sm">
        <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">{client.logoUrl ? <img src={client.logoUrl} alt={`Logo ${client.displayName}`} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" /> : <span aria-hidden="true" className="text-4xl font-black text-black">{client.displayName.charAt(0).toUpperCase()}</span>}</div>
        <span className="w-full truncate text-xs font-bold text-zinc-600" title={client.displayName}>{client.displayName}</span>
      </motion.article>)}</div>}
  </div>;
}
