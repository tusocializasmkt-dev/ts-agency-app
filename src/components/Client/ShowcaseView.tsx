import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Star } from 'lucide-react';
import { useBrands } from '../../hooks';

const ShowcaseView: React.FC = () => {
  const { brands } = useBrands();

  return (
    <div className="space-y-16 py-16 max-w-6xl mx-auto">
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-2 text-zinc-300">
           <Star className="w-4 h-4 fill-zinc-300" />
           <Star className="w-4 h-4 fill-zinc-300" />
           <Star className="w-4 h-4 fill-zinc-300" />
        </div>
        <h2 className="text-5xl font-black tracking-tighter uppercase text-black leading-none">Nossa Vitrine <br/> de Marcas</h2>
        <p className="text-zinc-400 max-w-xl mx-auto italic text-lg leading-relaxed">Marcas visionárias que confiam na nossa estratégia para dominar o mercado digital.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {brands.map((brand, idx) => (
          <motion.div 
            key={brand.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="aspect-square bg-white rounded-[3rem] border border-zinc-100 p-10 flex items-center justify-center grayscale hover:grayscale-0 hover:border-black hover:scale-105 transition-all cursor-default shadow-sm hover:shadow-2xl"
          >
            {brand.logoUrl ? (
               <img src={brand.logoUrl} alt={brand.name} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
               <div className="flex flex-col items-center gap-2">
                 <span className="text-4xl font-black text-black">{brand.name.charAt(0)}</span>
                 <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">{brand.name}</span>
               </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="pt-24 border-t border-zinc-100 flex flex-col items-center gap-4 text-zinc-300 text-[10px] uppercase tracking-[0.4em] font-black">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5" />
          <span>Official Partners Showroom</span>
        </div>
        <p className="normal-case tracking-normal italic font-medium">Todos os direitos reservados à TS Agency © 2024</p>
      </div>
    </div>
  );
};

export default ShowcaseView;
