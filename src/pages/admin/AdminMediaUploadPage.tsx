import { MediaUploadPanel } from '../../components/media';

export default function AdminMediaUploadPage() {
  return <div className="space-y-8">
    <header><p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Mídias</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Upload de mídias</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base">Selecione um cliente, revise os arquivos e acompanhe o progresso de cada envio.</p></header>
    <MediaUploadPanel />
  </div>;
}
