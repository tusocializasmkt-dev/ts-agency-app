import React from 'react';
import { Brand } from '../../types';
import { motion } from 'motion/react';
import { ArrowRight, Globe, Phone } from 'lucide-react';
import { cn } from '../../lib/utils';

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
          className="group bg-white border border-zinc-200 p-8 rounded-3xl flex items-center justify-between cursor-pointer hover:border-black transition-all shadow-sm"
        >
          <div className="flex items-center gap-8">
            <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center font-bold text-2xl group-hover:scale-105 transition-transform shadow-lg shadow-black/10">
              {brand.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight">{brand.name}</h3>
              <div className="flex items-center gap-6 mt-2">
                {brand.website && (
                  <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{brand.website.replace('https://', '')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{brand.phone || 'S/ Telefone'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8">
             <div className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                brand.status === 'active' ? 'bg-green-50 text-green-600 border-green-100' :
                brand.status === 'suspended' ? 'bg-red-50 text-red-600 border-red-100' :
                'bg-orange-50 text-orange-600 border-orange-100'
              )}>
                {brand.status}
              </div>
              <div className="p-3 rounded-full bg-zinc-50 text-zinc-300 group-hover:bg-black group-hover:text-white transition-all">
                <ArrowRight className="w-6 h-6" />
              </div>
          </div>
        </motion.div>
      ))}

      {brands.length === 0 && (
        <div className="text-center p-20 bg-zinc-50 border border-dashed border-zinc-200 rounded-3xl">
          <p className="text-zinc-400 font-medium font-mono uppercase tracking-[0.2em] text-xs underline underline-offset-8 decoration-zinc-200">Nenhum cliente cadastrado.</p>
          <p className="mt-3 text-sm text-zinc-500">Use “Novo cliente” para começar.</p>
        </div>
      )}
    </div>
  );
};

export default ClientList;
