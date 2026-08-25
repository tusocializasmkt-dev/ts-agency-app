import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThumbsUp, ThumbsDown, MessageSquare, Plus, Edit2 } from 'lucide-react';
import { Post } from '../types';
import PostModal from './Admin/PostModal';
import { cn } from '../lib/utils';
import { useBrands, useFeedback, usePosts } from '../hooks';
import { useAuth } from '../contexts/AuthContext';
import { PostMediaCarousel } from './media';
import { PostDecisionDialog, PostDecisionHistory } from './posts';

interface FeedViewProps {
  selectedBrandId: string | null;
  isAdmin: boolean;
  onBrandChange?: (id: string) => void;
}

const statusLabels: Record<Post['status'], string> = {
  pending: 'Pendente', approved: 'Aprovado', rejected: 'Reprovado',
  changes_requested: 'Ajustes solicitados', scheduled: 'Agendado',
};

const FeedView: React.FC<FeedViewProps> = ({ selectedBrandId, isAdmin, onBrandChange }) => {
  const { user, role } = useAuth();
  const { posts, loading, approve, reject, requestChanges, create, update, remove } = usePosts({
    brandId: selectedBrandId, actorUid: user?.uid, actorRole: role ?? 'client',
  });
  const { brands } = useBrands(undefined, isAdmin);
  const feedback = useFeedback();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [decision, setDecision] = useState<{ postId: string; mode: 'rejection' | 'changes' } | null>(null);
  const [processingPostId, setProcessingPostId] = useState<string | null>(null);
  const [network, setNetwork] = useState('');
  const [format, setFormat] = useState('');
  const [status, setStatus] = useState('');
  const visiblePosts = posts.filter(post => (!network || post.socialNetwork === network) && (!format || post.type === format) && (!status || post.status === status));

  const handleStatusChange = async (postId: string, status: 'approved' | 'rejected' | 'changes_requested', comment = '') => {
    if (processingPostId) return;
    setProcessingPostId(postId);
    try {
      if (status === 'approved') await approve(postId);
      else if (status === 'rejected') await reject(postId, comment);
      else await requestChanges(postId, comment);
      feedback.success(`Post ${status === 'approved' ? 'aprovado' : status === 'rejected' ? 'reprovado' : 'enviado para ajustes'}`);
      setDecision(null);
    } catch (error) {
      feedback.error('Erro ao atualizar status');
      throw error;
    } finally {
      setProcessingPostId(null);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" /></div>;

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm lg:flex-row lg:items-center">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Feed de Conteúdo</h2>
        {isAdmin && <select value={selectedBrandId || ''} onChange={(e) => onBrandChange?.(e.target.value)} className="bg-[#FAFAFA] border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-black transition-all">
          <option value="">Todos os Clientes</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
        </select>}
        <select aria-label="Filtrar por rede social" value={network} onChange={event => setNetwork(event.target.value)} className="min-h-10 rounded-xl border px-3 text-sm"><option value="">Todas as redes</option>{['instagram','facebook','tiktok','linkedin','youtube'].map(value => <option key={value} value={value}>{value}</option>)}</select>
        <select aria-label="Filtrar por formato" value={format} onChange={event => setFormat(event.target.value)} className="min-h-10 rounded-xl border px-3 text-sm"><option value="">Todos os formatos</option><option value="feed">Feed</option><option value="reels">Reels</option><option value="stories">Story</option><option value="carousel">Carrossel</option><option value="other">Outro</option></select>
        <select aria-label="Filtrar por status" value={status} onChange={event => setStatus(event.target.value)} className="min-h-10 rounded-xl border px-3 text-sm"><option value="">Todos os status</option>{Object.entries(statusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
      </div>
      {isAdmin && <button disabled={!brands.length} onClick={() => { setEditingPost(null); setIsModalOpen(true); }} className="flex min-h-11 items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-zinc-800 disabled:opacity-40 transition-all shadow-lg shadow-black/5"><Plus className="w-4 h-4" /> Novo post</button>}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"><AnimatePresence>
      {visiblePosts.map((post) => <motion.div key={post.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-3xl border border-zinc-200 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
        <div className="relative aspect-square bg-[#F5F5F5]">
          <PostMediaCarousel post={post} />
          <div className="absolute top-4 left-4 flex gap-2">
            <span className={cn('px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border', post.status === 'approved' ? 'bg-green-50 text-green-600 border-green-100' : post.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' : post.status === 'scheduled' ? 'bg-zinc-50 text-zinc-600 border-zinc-100' : 'bg-orange-50 text-orange-600 border-orange-100')}>{statusLabels[post.status]}</span>
            <span className="px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-wider text-white border border-white/10">{post.type}</span>
          </div>
          {isAdmin && <button onClick={() => { setEditingPost(post); setIsModalOpen(true); }} aria-label={`Editar post ${post.id}`} className="absolute bottom-4 right-4 bg-black text-white p-3 rounded-full hover:scale-110 transition-transform shadow-xl"><Edit2 className="w-4 h-4" /></button>}
        </div>
        <div className="p-6 flex-1 flex flex-col space-y-4">
          <div className="flex justify-between items-start"><span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{new Date(post.scheduledDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span><span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{post.socialNetwork}</span></div>
          <p className="text-sm line-clamp-3 text-zinc-600 leading-relaxed font-medium">{post.caption}</p>
          {(post.status === 'rejected' || post.status === 'changes_requested') && post.feedback && <div className={cn('p-3 rounded-xl text-[11px] leading-snug border', post.status === 'rejected' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-orange-50 border-orange-100 text-orange-700')}><strong className="uppercase tracking-tighter mr-1">Observação:</strong>{post.feedback}</div>}
          {post.status === 'pending' && <div className="pt-4 border-t border-zinc-100 flex gap-2">
            <button onClick={() => handleStatusChange(post.id, 'approved')} disabled={processingPostId !== null} className="flex-1 bg-green-50 text-green-600 hover:bg-green-600 font-bold py-2.5 rounded-xl hover:text-white transition-all flex items-center justify-center gap-2 text-xs border border-green-100 disabled:opacity-50"><ThumbsUp className="w-3.5 h-3.5" /> Aprovar</button>
            <button onClick={() => setDecision({ postId: post.id, mode: 'rejection' })} disabled={processingPostId !== null} className="flex-1 bg-red-50 text-red-600 hover:bg-red-600 font-bold py-2.5 rounded-xl hover:text-white transition-all flex items-center justify-center gap-2 text-xs border border-red-100 disabled:opacity-50"><ThumbsDown className="w-3.5 h-3.5" /> Reprovar</button>
            <button onClick={() => setDecision({ postId: post.id, mode: 'changes' })} disabled={processingPostId !== null} className="flex-1 bg-orange-50 text-orange-600 hover:bg-orange-600 font-bold py-2.5 rounded-xl hover:text-white transition-all flex items-center justify-center gap-2 text-xs border border-orange-100 disabled:opacity-50"><MessageSquare className="w-3.5 h-3.5" /> Ajustar</button>
          </div>}
          <PostDecisionHistory postId={post.id} />
        </div>
      </motion.div>)}
    </AnimatePresence></div>

    {!visiblePosts.length && <div className="border border-dashed border-zinc-200 p-14 text-center"><p className="text-zinc-500">Nenhum conteúdo cadastrado.</p>{isAdmin && <button disabled={!brands.length} onClick={() => { setEditingPost(null); setIsModalOpen(true); }} className="mt-4 min-h-11 bg-black px-5 font-bold text-white disabled:opacity-40"><Plus className="mr-2 inline h-4 w-4" />Novo post</button>}</div>}
    {isAdmin && isModalOpen && <PostModal aiEnabled={isAdmin} post={editingPost} brandId={editingPost?.brandId ?? selectedBrandId ?? ''} brands={brands} onClose={() => setIsModalOpen(false)} onDelete={editingPost ? async () => { await remove(editingPost.id); feedback.success('Post movido para a lixeira.'); setIsModalOpen(false); } : undefined} onSave={async (data) => {
      const targetBrandId = data.brandId; if (!targetBrandId) throw new Error('Selecione um cliente.');
      if (editingPost) { await update(editingPost.id, { ...data, brandId: targetBrandId }); feedback.success('Post atualizado!'); }
      else { await create(targetBrandId, data); feedback.success('Post criado!'); }
      setIsModalOpen(false);
    }} />}
    {decision && <PostDecisionDialog mode={decision.mode} processing={processingPostId === decision.postId} onCancel={() => setDecision(null)} onConfirm={(comment) => handleStatusChange(decision.postId, decision.mode === 'rejection' ? 'rejected' : 'changes_requested', comment)} />}
  </div>;
};

export default FeedView;
