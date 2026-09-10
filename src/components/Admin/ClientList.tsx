import React from 'react';
import { Brand } from '../../types';
import { motion } from 'motion/react';
import { ArrowRight, Globe, Phone } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BRAND_STATUS_LABELS, getBrandStatusBadgeClass, getBrandStatusRingClass, normalizeBrandStatus } from '../../brands/brand-status';

interface ClientListProps {
  brands: Brand[];
  onSelectBrand: (id: string) => void;
}

const ClientList: React.FC<ClientListProps> = ({ brands, onSelectBrand }) => {
  return (
    <div className="grid grid-cols-1 gap-4">
      {brands.map((brand) => (
        <motion.div 
          key={brand.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => onSelectBrand(brand.id)}
          className="group flex cursor-pointer flex-col gap-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-black sm:flex-row sm:items-center sm:justify-between sm:p-8"
        >
          <div className="flex min-w-0 items-center gap-5 sm:gap-8">
            <div className={cn("h-16 w-16 shrink-0 overflow-hidden bg-black text-white rounded-2xl flex items-center justify-center font-bold text-2xl group-hover:scale-105 transition-transform shadow-lg shadow-black/10 ring-4 ring-offset-4", getBrandStatusRingClass(brand.status))}>
              {brand.logoUrl ? <img src={brand.logoUrl} alt={`Logotipo de ${brand.name}`} className="h-full w-full object-cover" loading="lazy" /> : brand.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{brand.name}</h3>
              <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                {brand.website && (
                  <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                    <Globe className="w-3.5 h-3.5" />
                    <span className="truncate">{brand.website.replace('https://', '')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{brand.phone || 'S/ Telefone'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-start sm:gap-8">
             <div className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                getBrandStatusBadgeClass(brand.status)
              )}>
                {BRAND_STATUS_LABELS[normalizeBrandStatus(brand.status)]}
              </div>
              <div className="p-3 rounded-full bg-zinc-50 text-zinc-300 group-hover:bg-black group-hover:text-white transition-all">
                <ArrowRight className="w-6 h-6" />
              </div>
          </div>
        </motion.div>
      ))}

      {brands.length === 0 && (
        <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center sm:p-20">
          <p className="text-zinc-400 font-medium font-mono uppercase tracking-[0.2em] text-xs underline underline-offset-8 decoration-zinc-200">Nenhum cliente cadastrado.</p>
          <p className="mt-3 text-sm text-zinc-500">Use “Novo cliente” para começar.</p>
        </div>
      )}
    </div>
  );
};

export default ClientList;
