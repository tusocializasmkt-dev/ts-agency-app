import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBrands, useFeedback, usePosts } from '../hooks';
import PostModal from './Admin/PostModal';
import type { Post } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface CalendarViewProps {
  selectedBrandId: string | null;
  isAdmin: boolean;
  onBrandChange?: (id: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ selectedBrandId, isAdmin, onBrandChange }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const month = format(currentDate, 'yyyy-MM');
  const { user, role, isAdmin: isAdministrator } = useAuth();
  const { posts, create, update, remove } = usePosts({ brandId: selectedBrandId, month, actorUid: user?.uid, actorRole: role ?? 'client' });
  const { brands } = useBrands(undefined, isAdmin);
  const feedback = useFeedback();
  const [selectedDay, setSelectedDay] = useState<Date | null>(null); const [editingPost, setEditingPost] = useState<Post | null>(null); const [postOpen, setPostOpen] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 bg-white p-5 rounded-3xl border border-zinc-200 shadow-sm lg:flex-row lg:items-center lg:justify-between lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <h2 className="text-2xl font-bold tracking-tight text-black uppercase tracking-widest leading-none">Calendário</h2>
          <div className="flex min-w-0 items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-1.5 sm:ml-4">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-black hover:text-white rounded-xl transition-all"><ChevronLeft className="w-5 h-5" /></button>
            <div className="min-w-0 flex-1 px-2 py-2 text-center text-sm font-bold uppercase text-zinc-600 sm:min-w-[200px] sm:px-6">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</div>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-black hover:text-white rounded-xl transition-all"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">{isAdmin && <button disabled={!brands.length} onClick={() => { setSelectedDay(new Date()); setEditingPost(null); setPostOpen(true); }} className="min-h-11 rounded-xl bg-black px-5 font-bold text-white disabled:opacity-40"><Plus className="mr-2 inline h-4 w-4" />Novo post</button>}{isAdmin && (
           <select 
            value={selectedBrandId || ''} 
            onChange={(e) => onBrandChange?.(e.target.value)}
            className="bg-[#FAFAFA] border border-zinc-200 rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-black shadow-sm"
          >
            <option value="">Filtrar Cliente</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}</div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-zinc-200 bg-white shadow-sm"><div className="min-w-[700px]">
        <div className="grid grid-cols-7 border-b border-zinc-100 italic bg-zinc-50/30">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="py-5 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x divide-zinc-50 border-b border-zinc-50">
          {days.map((day, idx) => {
            const dayPosts = posts.filter(p => isSameDay(new Date(p.scheduledDate), day));
            return (
              <button type="button" key={idx} onClick={() => setSelectedDay(day)} className="min-h-[160px] border-b border-zinc-50 p-4 text-left hover:bg-zinc-50/50 transition-colors group relative overflow-hidden">
                <span className={cn(
                  "text-xs font-bold font-mono tracking-tighter mb-2 block",
                  !isSameDay(day, new Date()) ? "text-zinc-300" : "text-black underline underline-offset-4 decoration-2"
                )}>{day.getDate()}</span>
                <div className="space-y-1.5 mt-2">
                  {dayPosts.map(p => (
                    <div 
                      key={p.id}
                      title={`${p.status === 'changes_requested' ? 'Ajustes solicitados' : p.status}: ${p.caption}`}
                      className={cn(
                        "text-[9px] font-bold p-2 rounded-xl truncate uppercase tracking-tighter border shadow-sm",
                        p.status === 'approved' ? 'bg-green-50 text-green-600 border-green-100' :
                        p.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                        'bg-orange-50 text-orange-600 border-orange-100'
                      )}
                    >
                      {p.caption}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div></div>
      {selectedDay && !postOpen && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"><section role="dialog" aria-modal="true" aria-label={`Posts de ${format(selectedDay, 'dd/MM/yyyy')}`} className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl"><header className="flex items-center justify-between"><div><h3 className="text-xl font-bold">{format(selectedDay, 'dd/MM/yyyy')}</h3><p className="text-sm text-zinc-500">Conteúdos previstos para esta data</p></div><button aria-label="Fechar dia" onClick={() => setSelectedDay(null)} className="p-3"><X className="h-5 w-5" /></button></header><div className="mt-5 space-y-3">{posts.filter(post => isSameDay(new Date(post.scheduledDate), selectedDay)).map(post => <button key={post.id} onClick={() => { setEditingPost(post); setPostOpen(true); }} className="block w-full rounded-xl border p-4 text-left"><strong>{post.caption || 'Conteúdo sem legenda'}</strong><span className="mt-1 block text-xs uppercase text-zinc-500">{post.socialNetwork} · {post.type} · {post.status}</span></button>)}</div>{isAdmin && <button disabled={!brands.length} onClick={() => { setEditingPost(null); setPostOpen(true); }} className="mt-5 min-h-11 w-full rounded-xl bg-black px-5 font-bold text-white disabled:opacity-40"><Plus className="mr-2 inline h-4 w-4" />Adicionar post nesta data</button>}</section></div>}
      {postOpen && <PostModal aiEnabled={isAdmin} post={editingPost} brandId={editingPost?.brandId ?? selectedBrandId ?? ''} brands={brands} initialDate={selectedDay ? new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate(), 12).toISOString() : undefined} onClose={() => setPostOpen(false)} onDelete={isAdministrator && editingPost ? async () => { await remove(editingPost.id); feedback.success('Post movido para a lixeira.'); setPostOpen(false); setSelectedDay(null); } : undefined} onSave={async data => { const target = data.brandId; if (!target) throw new Error('Selecione um cliente.'); if (editingPost) await update(editingPost.id, data); else await create(target, data); feedback.success(editingPost ? 'Post atualizado.' : 'Post criado.'); setPostOpen(false); }} />}
    </div>
  );
};

export default CalendarView;
