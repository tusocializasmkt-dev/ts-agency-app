import React from 'react';
import { TrashItem } from '../../types';
import { Trash2, RotateCcw, AlertCircle } from 'lucide-react';
import { useFeedback, useModal, useTrash } from '../../hooks';

const TrashView: React.FC = () => {
  const { items, restore: restoreItem, removePermanently } = useTrash();
  const feedback = useFeedback();
  const { confirm } = useModal();

  const restore = async (item: TrashItem) => {
    try {
      await restoreItem(item);
      feedback.success('Post restaurado!');
    } catch (e) { feedback.error('Erro ao restaurar'); }
  };

  const permanentDelete = async (id: string) => {
    const confirmed = await confirm({ title: 'Excluir permanentemente?', description: 'Esta ação não poderá ser desfeita.', confirmLabel: 'Excluir', variant: 'destructive' });
    if (!confirmed) return;
    try {
      await removePermanently(id);
      feedback.success('Excluído com sucesso');
    } catch { feedback.error('Erro ao excluir'); }
  };

  return (
    <div className="space-y-8">
       <div className="flex flex-col gap-5 rounded-3xl border border-red-100 bg-red-50 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
          <div className="self-start rounded-2xl bg-red-500 p-4 text-white shadow-lg">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-red-600 uppercase tracking-tighter">Lixeira</h2>
            <p className="text-red-400 text-sm italic font-medium">Itens permanecem aqui até serem restaurados ou excluídos permanentemente.</p>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map(p => (
            <div key={p.id} className="bg-white border border-zinc-200 rounded-3xl p-6 flex flex-col gap-6 hover:border-black transition-all shadow-sm">
               <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{p.type}</span>
                  <div className="flex gap-2">
                    <button aria-label={`Restaurar ${p.caption}`} onClick={() => restore(p)} className="p-3 bg-zinc-50 hover:bg-black hover:text-white rounded-xl transition-all shadow-sm"><RotateCcw className="w-4 h-4" /></button>
                    <button aria-label={`Excluir permanentemente ${p.caption}`} onClick={() => permanentDelete(p.id)} className="p-3 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 rounded-xl transition-all shadow-sm"><Trash2 className="w-4 h-4" /></button>
                  </div>
               </div>
               <p className="text-sm line-clamp-3 italic text-zinc-500 leading-relaxed">{p.caption}</p>
            </div>
          ))}
       </div>

       {items.length === 0 && (
          <div className="rounded-[2rem] border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center sm:rounded-[3rem] sm:p-24">
            <p className="text-zinc-400 font-bold uppercase tracking-[0.3em] text-xs underline underline-offset-8 decoration-zinc-200">A lixeira está vazia.</p>
          </div>
       )}
    </div>
  );
};

export default TrashView;
