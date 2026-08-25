import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Calendar, Image, Save, Star, Trash2, Upload, X } from 'lucide-react';
import { MAX_MEDIA_PER_POST, type MediaAsset, type MediaCategory } from '../../media';
import type { Brand, Post } from '../../types';
import { loadMediaByIds } from '../../services/media.service';
import { useMediaUpload } from '../../hooks/useMediaUpload';
import { formatPostDateTimeForInput, localPostDateTimeToISOString } from '../../posts';
import { MediaPicker } from '../media';
import UploadQueue from '../media/UploadQueue';

interface PostModalProps { post?: Post | null; brandId?: string; brands?: Brand[]; initialDate?: string; onClose: () => void; onDelete?: () => void | Promise<void>; onSave: (data: Partial<Post>) => void | Promise<void>; }

export default function PostModal({ post, brandId = '', brands = [], initialDate, onClose, onDelete, onSave }: PostModalProps) {
  const titleId = useId(); const uploadInput = useRef<HTMLInputElement>(null); const upload = useMediaUpload();
  const [targetBrandId, setTargetBrandId] = useState(post?.brandId ?? brandId);
  const [formData, setFormData] = useState<Partial<Post>>(post ?? { type: 'feed', socialNetwork: 'instagram', caption: '', scheduledDate: initialDate ?? new Date().toISOString(), status: 'pending' });
  const [selectedIds, setSelectedIds] = useState<string[]>(post?.mediaIds ?? []);
  const [coverMediaId, setCoverMediaId] = useState<string | undefined>(post?.coverMediaId ?? post?.mediaIds?.[0]);
  const [assets, setAssets] = useState<MediaAsset[]>([]); const [pickerOpen, setPickerOpen] = useState(false); const [error, setError] = useState<string | null>(null); const [saving, setSaving] = useState(false);

  useEffect(() => { let active = true; if (!selectedIds.length) { setAssets([]); return; } loadMediaByIds(selectedIds).then(items => { if (active) setAssets(items); }); return () => { active = false; }; }, [selectedIds]);
  useEffect(() => { const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = overflow; }; }, []);
  useEffect(() => { const completed = upload.items.filter(item => item.state === 'completed').map(item => item.mediaId ?? item.id); if (completed.length) setSelectedIds(current => [...new Set([...current, ...completed])]); }, [upload.items]);

  const choose = (ids: string[]) => { setSelectedIds(ids); setCoverMediaId(current => current && ids.includes(current) ? current : ids[0]); setPickerOpen(false); };
  const remove = (id: string) => { const remaining = selectedIds.filter(value => value !== id); setSelectedIds(remaining); setCoverMediaId(current => current === id ? remaining[0] : current); };
  const move = (index: number, direction: -1 | 1) => { const target = index + direction; if (target < 0 || target >= selectedIds.length) return; setSelectedIds(current => { const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; }); };
  const removeUpload = (id: string) => { const item = upload.items.find(candidate => candidate.id === id); if (item?.mediaId) remove(item.mediaId); upload.remove(id); };
  const addUploads = (files: File[]) => {
    if (!targetBrandId) return setError('Selecione um cliente antes de fazer upload.');
    if (selectedIds.length + files.length > MAX_MEDIA_PER_POST) return setError(`Um post pode ter no máximo ${MAX_MEDIA_PER_POST} mídias.`);
    try { const category: MediaCategory = ['feed', 'stories', 'reels', 'carousel'].includes(formData.type ?? '') ? formData.type as MediaCategory : 'other'; upload.enqueue(targetBrandId, files, category); upload.start(); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível adicionar a mídia.'); }
  };
  const uploadPending = upload.items.some(item => item.state === 'queued' || item.state === 'uploading');
  const uploadFailed = upload.items.some(item => item.state === 'failed');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!targetBrandId) return setError('Selecione um cliente.');
    if (uploadPending) return setError('Aguarde o término dos uploads.');
    if (uploadFailed) return setError('Remova ou tente novamente os uploads com falha.');
    setError(null); setSaving(true);
    try { await onSave({ ...formData, brandId: targetBrandId, mediaIds: selectedIds, coverMediaId: selectedIds.length ? coverMediaId ?? selectedIds[0] : undefined }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o post.'); }
    finally { setSaving(false); }
  };
  const byId = new Map(assets.map(asset => [asset.id, asset]));
  const legacyUrls = !selectedIds.length ? post?.mediaUrls?.length ? post.mediaUrls : post?.mediaUrl ? [post.mediaUrl] : [] : [];

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 p-4 backdrop-blur-xl" onMouseDown={event => { if (event.target === event.currentTarget && !pickerOpen && !uploadPending) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-8">
      <header className="mb-8 flex items-center justify-between"><h2 id={titleId} className="text-2xl font-black uppercase tracking-tight">{post ? 'Editar conteúdo' : 'Criar novo post'}</h2><button type="button" disabled={uploadPending} onClick={onClose} aria-label="Fechar modal de post" className="rounded-xl p-3 hover:bg-zinc-100 disabled:opacity-40"><X className="h-5 w-5" /></button></header>
      <form onSubmit={submit} className="space-y-7">
        {!post && <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">Cliente<select aria-label="Cliente do post" value={targetBrandId} onChange={event => { upload.clearAll(); setTargetBrandId(event.target.value); setSelectedIds([]); setCoverMediaId(undefined); }} className="mt-2 min-h-12 w-full rounded-xl border px-4 text-sm"><option value="">Selecione</option>{brands.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        <div className="grid gap-5 sm:grid-cols-2"><Select label="Plataforma" value={formData.socialNetwork ?? 'instagram'} onChange={value => setFormData({ ...formData, socialNetwork: value })} options={[['instagram','Instagram'],['facebook','Facebook'],['tiktok','TikTok'],['linkedin','LinkedIn'],['youtube','YouTube']]} /><Select label="Tipo de post" value={formData.type ?? 'feed'} onChange={value => setFormData({ ...formData, type: value as Post['type'] })} options={[['feed','Feed'],['reels','Reels'],['stories','Story'],['carousel','Carrossel'],['other','Outro']]} /></div>
        <Select label="Objetivo" value={formData.objective ?? ''} onChange={value => setFormData({ ...formData, objective: value as Post['objective'] || undefined })} options={[['','Não definido'],['venda','Venda'],['engajamento','Engajamento'],['autoridade','Autoridade'],['tráfego','Tráfego']]} />
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">Legenda / descritivo<textarea value={formData.caption ?? ''} onChange={event => setFormData({ ...formData, caption: event.target.value })} rows={5} className="mt-2 w-full resize-none rounded-2xl border p-4 text-sm text-black" /></label>
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">Data e hora<div className="relative mt-2"><Calendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><input type="datetime-local" value={formatPostDateTimeForInput(formData.scheduledDate)} onChange={event => { try { setFormData({ ...formData, scheduledDate: localPostDateTimeToISOString(event.target.value) }); setError(null); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Data inválida.'); } }} className="min-h-12 w-full rounded-xl border py-3 pl-11 pr-4 text-sm" /></div></label>
        <Select label="Status inicial" value={formData.status ?? 'pending'} onChange={value => setFormData({ ...formData, status: value as Post['status'] })} options={[['pending','Pendente'],['scheduled','Agendado']]} />

        <section aria-labelledby="post-media-title" className="rounded-2xl border p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 id="post-media-title" className="font-bold">Mídias do post</h3><p className="text-sm text-zinc-500">Envie um arquivo novo ou reutilize uma mídia da biblioteca.</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={!targetBrandId || uploadPending} onClick={() => uploadInput.current?.click()} className="min-h-11 rounded-xl border border-black px-4 text-sm font-bold disabled:opacity-40"><Upload className="mr-2 inline h-4 w-4" />Fazer upload</button><button type="button" disabled={!targetBrandId || uploadPending} onClick={() => setPickerOpen(true)} className="min-h-11 rounded-xl bg-black px-4 text-sm font-bold text-white disabled:opacity-40"><Image className="mr-2 inline h-4 w-4" />Selecionar da biblioteca</button><input ref={uploadInput} type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" aria-label="Arquivos para o post" className="hidden" onChange={event => { const files = Array.from(event.target.files ?? []); if (files.length) addUploads(files); event.target.value = ''; }} /></div></div>
          {upload.items.length > 0 && <div className="mt-5"><h4 className="mb-3 text-sm font-bold">Uploads desta operação</h4><UploadQueue items={upload.items} onCancel={removeUpload} onRetry={upload.retry} /><div className="mt-2 flex flex-wrap gap-2">{upload.items.map(item => <button key={item.id} type="button" onClick={() => removeUpload(item.id)} className="text-xs font-bold text-red-600">Remover {item.file.name}</button>)}</div>{upload.error && <p role="alert" className="mt-3 text-sm text-red-600">{upload.error}</p>}</div>}
          {selectedIds.length ? <ol className="mt-5 space-y-3">{selectedIds.map((id, index) => { const asset = byId.get(id); const url = asset?.downloadUrl; return <li key={id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100">{asset?.mediaType === 'image' && url ? <img src={url} alt={asset.originalFileName} className="h-full w-full object-cover" /> : asset?.mediaType === 'video' && url ? <video src={url} aria-label={asset.originalFileName} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-xs">Mídia</span>}</div><div className="min-w-0 flex-1"><p className="truncate font-bold">{index + 1}. {asset?.originalFileName ?? 'Carregando mídia...'}</p><p className="text-xs text-zinc-500">{coverMediaId === id ? 'Capa do post' : asset?.mediaType ?? ''}</p></div><div className="flex gap-2"><IconButton label={`Mover ${index + 1} para esquerda`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowLeft /></IconButton><IconButton label={`Mover ${index + 1} para direita`} disabled={index === selectedIds.length - 1} onClick={() => move(index, 1)}><ArrowRight /></IconButton><IconButton label={`Definir mídia ${index + 1} como capa`} onClick={() => setCoverMediaId(id)} active={coverMediaId === id}><Star /></IconButton><IconButton label={`Remover mídia ${index + 1}`} onClick={() => remove(id)} danger><Trash2 /></IconButton></div></li>; })}</ol> : legacyUrls.length ? <div className="mt-5"><p className="mb-2 text-sm font-bold text-orange-700">Mídia legada preservada</p>{legacyUrls.map((url, index) => <img key={url} src={url} alt={`Mídia legada ${index + 1}`} className="h-32 w-32 rounded-xl object-contain" />)}</div> : <p className="mt-5 rounded-xl bg-zinc-50 p-6 text-center text-sm text-zinc-500">Nenhuma mídia selecionada.</p>}
        </section>
        {error && <p role="alert" className="text-sm font-bold text-red-600">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3 border-t pt-6">{post && onDelete && <button type="button" onClick={() => void onDelete()} className="mr-auto min-h-12 rounded-xl border border-red-200 px-6 text-sm font-bold text-red-600"><Trash2 className="mr-2 inline h-4 w-4" />Mover para lixeira</button>}<button type="button" disabled={uploadPending} onClick={onClose} className="min-h-12 rounded-xl border px-6 text-sm font-bold">Cancelar</button><button type="submit" disabled={saving || uploadPending || uploadFailed} className="min-h-12 rounded-xl bg-black px-7 text-sm font-bold text-white disabled:opacity-50"><Save className="mr-2 inline h-4 w-4" />{uploadPending ? 'Enviando mídia...' : saving ? 'Salvando...' : post ? 'Salvar alterações' : 'Criar post'}</button></div>
      </form>
    </div>
    {pickerOpen && targetBrandId && <MediaPicker brandId={targetBrandId} selectedIds={selectedIds} onConfirm={choose} onCancel={() => setPickerOpen(false)} />}
  </div>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) { return <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">{label}<select aria-label={label} value={value} onChange={event => onChange(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4 text-sm text-black">{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>; }
function IconButton({ label, onClick, disabled, active, danger, children }: { label: string; onClick: () => void; disabled?: boolean; active?: boolean; danger?: boolean; children: React.ReactElement<{ className?: string }> }) { return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className={`rounded-lg border p-2 disabled:opacity-30 ${active ? 'bg-black text-white' : ''} ${danger ? 'border-red-200 text-red-600' : ''}`}>{children}</button>; }
