import type { Brand } from '../../types';
import type { MediaLibraryFilters as Filters } from '../../media';

interface MediaFiltersProps { brands: Brand[]; filters: Filters; onChange: (filters: Filters) => void; onClear: () => void; }

export default function MediaFilters({ brands, filters, onChange, onClear }: MediaFiltersProps) {
  const change = (field: keyof Filters, value: string) => onChange({ ...filters, [field]: value || undefined });
  const selectedBrand = brands.find(brand => brand.id === filters.brandId);
  return <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5" aria-label="Filtros da biblioteca">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <label className="text-sm font-bold text-zinc-700">Cliente<select aria-label="Filtrar por cliente" value={filters.brandId ?? ''} onChange={event => change('brandId', event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"><option value="">Todos os clientes</option>{brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
      <label className="text-sm font-bold text-zinc-700">Tipo<select aria-label="Filtrar por tipo" value={filters.type ?? ''} onChange={event => change('type', event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"><option value="">Todos</option><option value="image">Imagens</option><option value="video">Vídeos</option></select></label>
      <label className="text-sm font-bold text-zinc-700">Status<select aria-label="Filtrar por status" value={filters.status ?? ''} onChange={event => change('status', event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"><option value="">Todos</option><option value="ready">Prontos</option><option value="failed">Falha</option><option value="deleted">Excluídos</option></select></label>
      <label className="text-sm font-bold text-zinc-700">Ordenação<select aria-label="Ordenar mídias" value={filters.order ?? 'newest'} onChange={event => change('order', event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"><option value="newest">Mais recentes</option><option value="oldest">Mais antigos</option><option value="name-asc">Nome A-Z</option><option value="name-desc">Nome Z-A</option><option value="size-desc">Maior tamanho</option><option value="size-asc">Menor tamanho</option></select></label>
      <label className="text-sm font-bold text-zinc-700">Buscar<input aria-label="Buscar por nome" type="search" value={filters.search ?? ''} onChange={event => change('search', event.target.value)} placeholder="Nome do arquivo" className="mt-2 min-h-11 w-full rounded-xl border border-zinc-300 px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black" /></label>
    </div>
    {selectedBrand && <div className="mt-4 flex items-center gap-2 text-sm text-zinc-600">{selectedBrand.logoUrl && <img src={selectedBrand.logoUrl} alt={`Logo de ${selectedBrand.name}`} loading="lazy" className="h-7 w-7 rounded-full object-cover" />}<span>Cliente selecionado: <strong>{selectedBrand.name}</strong></span></div>}
    <div className="mt-4 flex justify-end"><button type="button" onClick={onClear} className="min-h-11 rounded-xl px-4 text-sm font-bold text-zinc-600 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">Limpar filtros</button></div>
  </section>;
}
