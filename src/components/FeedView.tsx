import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThumbsUp, ThumbsDown, MessageSquare, Plus, Edit2, Search } from 'lucide-react';
import { Post } from '../types';
import PostModal from './Admin/PostModal';
import CopyCaptionButton from './posts/CopyCaptionButton';
import { cn } from '../lib/utils';
import { useBrands, useFeedback, usePosts } from '../hooks';
import { useAuth } from '../contexts/AuthContext';
import { PostMediaCarousel } from './media';
import { PostDecisionDialog, PostDecisionHistory } from './posts';
import { feedFilters, filterFeed, matchesPostSearch, type FeedFilter } from '../posts/feed-filter';
import { postStatusLabels as statusLabels, postTypeLabels } from '../posts/post-labels';

interface FeedViewProps {
  selectedBrandId: string | null;
  isAdmin: boolean;
  onBrandChange?: (id: string) => void;
}

const FeedView: React.FC<FeedViewProps> = ({ selectedBrandId, isAdmin, onBrandChange }) => {
  const { user, role, brandIds = [], isAdmin: isAdministrator } = useAuth();
  const { posts, loading, error, approve, reject, requestChanges, create, update, remove, setPublished } = usePosts({
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
  const [status, setStatus] = useState<FeedFilter>('ongoing');
  const [search, setSearch] = useState('');
  const visiblePosts = filterFeed(posts, status).filter(post => (!network || post.socialNetwork === network) && (!format || post.type === format) && matchesPostSearch(post, search));
  const canPublish = (post: Post) => Boolean(user) && (role === 'admin' || ((role === 'manager' || role === 'social_media') && brandIds.includes(post.brandId)));
  const handlePublication = async (post: Post) => {
    if (processingPostId) return;
    setProcessingPostId(post.id);
    try {
      await setPublished(post.id, !post.published);
      feedback.success(post.published ? 'Publicação voltou ao Feed.' : 'Post marcado como postado.');
    } catch { feedback.error('Não foi possível atualizar a publicação.'); }
    finally { setProcessingPostId(null); }
  };

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

  if (loading) return <div role="status" className="flex items-center justify-center gap-3 p-12 text-sm text-zinc-600"><div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-200 border-t-black" />Carregando publicações...</div>;

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <h2 className="text-2xl font-bold tracking-tight">Feed de Conteúdo</h2>
        <label className="relative w-full sm:max-w-sm"><span className="sr-only">Pesquisar publicações</span><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-500" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Pesquisar na legenda ou no título" className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-black" /></label>
        {isAdmin && <select value={selectedBrandId || ''} onChange={(e) => onBrandChange?.(e.target.value)} className="min-h-11 min-w-0 rounded-xl border border-zinc-200 bg-[#FAFAFA] px-4 py-2 text-sm transition-all focus:border-black focus:outline-none">
          <option value="">Todos os Clientes</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
        </select>}
        <select aria-label="Filtrar por rede social" value={network} onChange={event => setNetwork(event.target.value)} className="min-h-11 min-w-0 rounded-xl border px-3 text-sm"><option value="">Todas as redes</option>{['instagram','facebook','tiktok','linkedin','youtube'].map(value => <option key={value} value={value}>{value}</option>)}</select>
        <select aria-label="Filtrar por formato" value={format} onChange={event => setFormat(event.target.value)} className="min-h-11 min-w-0 rounded-xl border px-3 text-sm"><option value="">Todos os formatos</option><option value="feed">Feed</option><option value="reels">Reels</option><option value="stories">Stories</option><option value="carousel">Carrossel</option><option value="other">Outro</option></select>
        <select aria-label="Filtrar por status" value={status} onChange={event => setStatus(event.target.value as FeedFilter)} className="min-h-11 min-w-0 rounded-xl border px-3 text-sm">{Object.entries(feedFilters).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
      </div>
      {isAdmin && <button disabled={!brands.length} onClick={() => { setEditingPost(null); setIsModalOpen(true); }} className="flex min-h-11 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-black px-6 py-3 text-sm font-bold text-white shadow-lg shadow-black/5 transition-all hover:bg-zinc-800 disabled:opacity-40 lg:w-auto"><Plus className="w-4 h-4" /> Novo post</button>}
    </div>

    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700">{error} A pesquisa pode estar incompleta.</p> : <p className="text-sm text-zinc-500" aria-live="polite">{visiblePosts.length} {visiblePosts.length === 1 ? 'publicação encontrada' : 'publicações encontradas'}. A busca considera todo o histórico carregado da seleção atual e os filtros ativos. Para incluir publicações postadas, selecione “Todas” ou “Já postadas”. Sem conexão, o histórico em cache pode estar incompleto.</p>}
    {!selectedBrandId && (role === 'manager' || role === 'social_media') && brandIds.length > 30 && <p role="status" className="rounded-xl border border-zinc-200 p-4 text-sm text-zinc-600">Esta visão reúne as primeiras 30 marcas atribuídas. Selecione uma marca para pesquisar todo o histórico dela.</p>}

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"><AnimatePresence>
      {visiblePosts.map((post) => <motion.div key={post.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-3xl border border-zinc-200 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
        <div className="relative bg-[#F5F5F5]">
          <PostMediaCarousel post={post} />
          <div className="absolute top-4 left-4 flex gap-2">
            <span className={cn('px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border', post.status === 'approved' ? 'bg-green-50 text-green-600 border-green-100' : post.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' : post.status === 'scheduled' ? 'bg-zinc-50 text-zinc-600 border-zinc-100' : 'bg-orange-50 text-orange-600 border-orange-100')}>{statusLabels[post.status]}</span>
            <span className="px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-wider text-white border border-white/10">{postTypeLabels[post.type]}</span>
          </div>
          {isAdmin && <button onClick={() => { setEditingPost(post); setIsModalOpen(true); }} aria-label={`Editar post ${post.id}`} className="absolute bottom-4 right-4 bg-black text-white p-3 rounded-full hover:scale-110 transition-transform shadow-xl"><Edit2 className="w-4 h-4" /></button>}
        </div>
        <div className="p-6 flex-1 flex flex-col space-y-4">
          <div className="flex justify-between items-start"><span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{new Date(post.scheduledDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span><span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{post.socialNetwork}</span></div>
          {post.title && <h3 className="break-words text-base font-bold">{post.title}</h3>}
          <p className="whitespace-pre-wrap break-words text-sm line-clamp-3 text-zinc-600 leading-relaxed font-medium">{post.caption}</p>
          <CopyCaptionButton caption={post.caption} />
          {post.published && <p className="text-xs font-bold text-green-700">POSTADO{post.publishedAt && 'toDate' in post.publishedAt ? ` · ${post.publishedAt.toDate().toLocaleString('pt-BR')}` : ''}</p>}
          {canPublish(post) && (post.status === 'approved' || post.published) && <button disabled={processingPostId !== null} onClick={() => handlePublication(post)} className="min-h-11 rounded-xl border border-green-200 px-4 py-2 text-sm font-bold text-green-700 disabled:opacity-50">{post.published ? 'Desmarcar como postado' : 'Marcar como postado'}</button>}
          {(post.status === 'rejected' || post.status === 'changes_requested') && post.feedback && <div className={cn('p-3 rounded-xl text-[11px] leading-snug border', post.status === 'rejected' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-orange-50 border-orange-100 text-orange-700')}><strong className="uppercase tracking-tighter mr-1">Observação:</strong>{post.feedback}</div>}
          {post.status === 'pending' && <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4 sm:flex-nowrap">
            <button onClick={() => handleStatusChange(post.id, 'approved')} disabled={processingPostId !== null} className="flex-1 bg-green-50 text-green-600 hover:bg-green-600 font-bold py-2.5 rounded-xl hover:text-white transition-all flex items-center justify-center gap-2 text-xs border border-green-100 disabled:opacity-50"><ThumbsUp className="w-3.5 h-3.5" /> Aprovar</button>
            <button onClick={() => setDecision({ postId: post.id, mode: 'rejection' })} disabled={processingPostId !== null} className="flex-1 bg-red-50 text-red-600 hover:bg-red-600 font-bold py-2.5 rounded-xl hover:text-white transition-all flex items-center justify-center gap-2 text-xs border border-red-100 disabled:opacity-50"><ThumbsDown className="w-3.5 h-3.5" /> Reprovar</button>
            <button onClick={() => setDecision({ postId: post.id, mode: 'changes' })} disabled={processingPostId !== null} className="flex-1 bg-orange-50 text-orange-600 hover:bg-orange-600 font-bold py-2.5 rounded-xl hover:text-white transition-all flex items-center justify-center gap-2 text-xs border border-orange-100 disabled:opacity-50"><MessageSquare className="w-3.5 h-3.5" /> Ajustar</button>
          </div>}
          <PostDecisionHistory postId={post.id} />
        </div>
      </motion.div>)}
    </AnimatePresence></div>

    {!visiblePosts.length && !error && <div className="rounded-3xl border border-dashed border-zinc-200 px-5 py-12 text-center"><p className="font-bold text-zinc-700">Nenhuma publicação encontrada.</p><p className="mt-2 text-sm text-zinc-500">Tente outras palavras ou ajuste os filtros para encontrar o conteúdo.</p>{isAdmin && <button disabled={!brands.length} onClick={() => { setEditingPost(null); setIsModalOpen(true); }} className="mt-4 min-h-11 rounded-xl bg-black px-5 font-bold text-white disabled:opacity-40"><Plus className="mr-2 inline h-4 w-4" />Novo post</button>}</div>}
    {isAdmin && isModalOpen && <PostModal aiEnabled={isAdmin} post={editingPost} brandId={editingPost?.brandId ?? selectedBrandId ?? ''} brands={brands} onClose={() => setIsModalOpen(false)} onDelete={isAdministrator && editingPost ? async () => { await remove(editingPost.id); feedback.success('Post movido para a lixeira.'); setIsModalOpen(false); } : undefined} onSave={async (data) => {
      const targetBrandId = data.brandId; if (!targetBrandId) throw new Error('Selecione um cliente.');
      if (editingPost) { await update(editingPost.id, { ...data, brandId: targetBrandId }); feedback.success('Post atualizado!'); }
      else { await create(targetBrandId, data); feedback.success('Post criado!'); }
      setIsModalOpen(false);
    }} />}
    {decision && <PostDecisionDialog mode={decision.mode} processing={processingPostId === decision.postId} onCancel={() => setDecision(null)} onConfirm={(comment) => handleStatusChange(decision.postId, decision.mode === 'rejection' ? 'rejected' : 'changes_requested', comment)} />}
  </div>;
};

export default FeedView;
