import { Download, ExternalLink, File, Image as ImageIcon, ShieldAlert, Video } from 'lucide-react';
import type { MediaAsset } from '../../media';

interface MediaDetailsPanelProps { asset: MediaAsset; brandName: string; onClose: () => void; onDelete: (asset: MediaAsset) => void; onRestore: (asset: MediaAsset) => void; }
const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

export default function MediaDetailsPanel({ asset, brandName, onClose, onDelete, onRestore }: MediaDetailsPanelProps) {
  const isPdf = asset.mimeType === 'application/pdf';
  const downloadUrl = asset.downloadUrl && /^https?:\/\//i.test(asset.downloadUrl) ? asset.downloadUrl : undefined;
  return <div className="max-h-[70vh] overflow-y-auto pr-1">
    <div className="overflow-hidden rounded-2xl bg-zinc-100">
      {asset.mediaType === 'image' && downloadUrl ? <img src={downloadUrl} alt={`Preview ampliado de ${asset.originalFileName}`} className="max-h-[45vh] w-full object-contain" /> : asset.mediaType === 'video' && downloadUrl ? <video src={downloadUrl} aria-label={`Vídeo ${asset.originalFileName}`} controls preload="metadata" className="max-h-[45vh] w-full bg-black" /> : <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-zinc-500">{isPdf ? <File className="h-12 w-12" /> : asset.mediaType === 'image' ? <ImageIcon className="h-12 w-12" /> : <Video className="h-12 w-12" />}<span>{isPdf ? 'Documento PDF' : 'Preview indisponível'}</span></div>}
    </div>
    <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
      <div><dt className="font-bold text-zinc-500">Nome original</dt><dd className="mt-1 break-words">{asset.originalFileName}</dd></div><div><dt className="font-bold text-zinc-500">Nome armazenado</dt><dd className="mt-1 break-words">{asset.fileName}</dd></div>
      <div><dt className="font-bold text-zinc-500">Cliente</dt><dd className="mt-1">{brandName}</dd></div><div><dt className="font-bold text-zinc-500">Tipo</dt><dd className="mt-1">{asset.mediaType === 'image' ? 'Imagem' : 'Vídeo'} · {asset.mimeType}</dd></div>
      <div><dt className="font-bold text-zinc-500">Tamanho</dt><dd className="mt-1">{formatSize(asset.sizeBytes)}</dd></div><div><dt className="font-bold text-zinc-500">Status</dt><dd className="mt-1">{asset.status}</dd></div>
      <div><dt className="font-bold text-zinc-500">Criada em</dt><dd className="mt-1">{asset.createdAt?.toLocaleString('pt-BR') ?? 'Indisponível'}</dd></div><div><dt className="font-bold text-zinc-500">Origem</dt><dd className="mt-1">{asset.source === 'upload' ? 'Upload' : asset.source}</dd></div>
      {asset.deletedAt && <div><dt className="font-bold text-zinc-500">Excluída em</dt><dd className="mt-1">{asset.deletedAt.toLocaleString('pt-BR')}</dd></div>}
    </dl>
    {downloadUrl && <div className="mt-6 flex flex-wrap gap-2"><a href={downloadUrl} target="_blank" rel="noreferrer" className="min-h-11 rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold hover:bg-zinc-50"><ExternalLink className="mr-1 inline h-4 w-4" />Abrir</a><a href={downloadUrl} download={asset.originalFileName} className="min-h-11 rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold hover:bg-zinc-50"><Download className="mr-1 inline h-4 w-4" />Baixar</a></div>}
    {asset.status === 'deleted' && <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800"><p className="flex gap-2 font-bold"><ShieldAlert className="h-5 w-5 shrink-0" />Exclusão permanente bloqueada</p><p className="mt-1">Verificação de uso indisponível. Exclusão permanente não permitida.</p></div>}
    <div className="mt-8 flex flex-wrap justify-end gap-2"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-zinc-300 px-5 text-sm font-bold hover:bg-zinc-50">Fechar</button>{asset.status === 'ready' && <button type="button" onClick={() => onDelete(asset)} className="min-h-11 rounded-xl bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-700">Mover para lixeira</button>}{asset.status === 'deleted' && <button type="button" onClick={() => onRestore(asset)} className="min-h-11 rounded-xl bg-black px-5 text-sm font-bold text-white hover:bg-zinc-800">Restaurar</button>}</div>
  </div>;
}
