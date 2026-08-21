import { useEffect, useRef, useState } from 'react';
import { Play, Trash2 } from 'lucide-react';
import { useBrands, useFeedback, useMediaUpload, useModal } from '../../hooks';
import type { MediaUploadState } from '../../media';
import MediaDropzone from './MediaDropzone';
import UploadQueue from './UploadQueue';

export default function MediaUploadPanel() {
  const { brands, loading: brandsLoading, error: brandsError } = useBrands();
  const upload = useMediaUpload();
  const feedback = useFeedback();
  const { confirm } = useModal();
  const [brandId, setBrandId] = useState('');
  const previousStates = useRef(new Map<string, MediaUploadState>());

  useEffect(() => {
    upload.items.forEach(item => {
      const previous = previousStates.current.get(item.id);
      if (previous && previous !== item.state) {
        if (item.state === 'completed') feedback.success('Upload concluído', { description: item.file.name });
        if (item.state === 'failed') feedback.error('Upload com falha', { description: item.file.name });
        if (item.state === 'cancelled') feedback.info('Upload cancelado', { description: item.file.name });
      }
      previousStates.current.set(item.id, item.state);
    });
  }, [feedback, upload.items]);

  const changeBrand = async (nextBrandId: string) => {
    if (nextBrandId === brandId) return;
    if (upload.items.length) {
      const accepted = await confirm({ title: 'Trocar cliente?', description: 'A fila atual será cancelada e removida antes de trocar o cliente.', confirmLabel: 'Trocar cliente', cancelLabel: 'Manter cliente', destructive: true });
      if (!accepted) return;
      upload.clearAll();
    }
    setBrandId(nextBrandId);
  };

  const addFiles = (files: File[]) => {
    if (!brandId) { feedback.warning('Selecione um cliente', { description: 'Escolha o cliente antes de adicionar arquivos.' }); return; }
    try { upload.enqueue(brandId, files); feedback.success('Lote aceito', { description: `${files.length} arquivo(s) adicionado(s) à fila.` }); }
    catch (cause) { feedback.error('Arquivo rejeitado', { description: cause instanceof Error ? cause.message : 'Revise os arquivos selecionados.' }); }
  };
  const dropzoneError = (message: string) => {
    if (!brandId) feedback.warning('Selecione um cliente', { description: message });
    else feedback.error('Arquivo rejeitado', { description: message });
  };
  const cancel = (id: string) => { if (upload.cancel(id)) feedback.info('Cancelamento solicitado'); };
  const retry = (id: string) => { if (upload.retry(id)) feedback.info('Nova tentativa iniciada'); };
  const clearQueue = async () => {
    if (upload.isUploading) {
      const accepted = await confirm({ title: 'Limpar fila?', description: 'Uploads ativos serão cancelados e todos os itens serão removidos.', confirmLabel: 'Limpar fila', cancelLabel: 'Continuar uploads', destructive: true });
      if (!accepted) return;
    }
    upload.clearAll();
  };
  const queued = upload.items.some(item => item.state === 'queued');
  const completed = upload.items.some(item => item.state === 'completed');

  return <section className="space-y-6" aria-label="Envio de mídias">
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
      <label htmlFor="media-brand" className="mb-2 block text-sm font-bold text-zinc-900">Cliente</label>
      <select id="media-brand" value={brandId} disabled={brandsLoading} onChange={event => void changeBrand(event.target.value)} className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50">
        <option value="">{brandsLoading ? 'Carregando clientes...' : 'Selecione um cliente'}</option>
        {brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
      </select>
      {brandsError && <p className="mt-2 text-sm text-red-600" role="alert">{brandsError}</p>}
    </div>

    <MediaDropzone brandSelected={Boolean(brandId)} disabled={brandsLoading} onFiles={addFiles} onError={dropzoneError} />

    <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-lg font-bold">Fila de upload</h2><p className="mt-1 text-sm text-zinc-500">Revise os arquivos antes de iniciar.</p></div>
        <div className="flex flex-wrap gap-2">
          {completed && <button type="button" onClick={upload.clearCompleted} className="min-h-11 rounded-xl border border-zinc-300 px-4 text-sm font-bold hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">Remover concluídos</button>}
          {upload.items.length > 0 && <button type="button" onClick={() => void clearQueue()} className="min-h-11 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"><Trash2 className="mr-1 inline h-4 w-4" />Limpar fila</button>}
          <button type="button" onClick={upload.start} disabled={!brandId || !queued || upload.isUploading} className="min-h-11 rounded-xl bg-black px-5 text-sm font-bold text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"><Play className="mr-1 inline h-4 w-4" />Iniciar upload</button>
        </div>
      </div>
      {upload.items.length > 0 && <div className="my-6" aria-label="Progresso geral"><div className="mb-2 flex justify-between text-sm"><span className="font-medium">Progresso geral</span><span>{upload.totalProgress}%</span></div><div className="h-3 overflow-hidden rounded-full bg-zinc-200" role="progressbar" aria-label="Progresso geral dos uploads" aria-valuemin={0} aria-valuemax={100} aria-valuenow={upload.totalProgress}><div className="h-full rounded-full bg-black transition-[width]" style={{ width: `${upload.totalProgress}%` }} /></div></div>}
      {upload.error && <p className="my-4 text-sm text-red-600" role="alert">{upload.error}</p>}
      <div className={upload.items.length ? 'mt-6' : 'mt-5'}><UploadQueue items={upload.items} onCancel={cancel} onRetry={retry} /></div>
    </div>
  </section>;
}
