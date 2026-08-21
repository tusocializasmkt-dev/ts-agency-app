import { Images, RotateCcw, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../app/router/routes';

interface MediaLibraryEmptyStateProps { kind: 'library' | 'filters' | 'deleted'; onClear: () => void; }
export default function MediaLibraryEmptyState({ kind, onClear }: MediaLibraryEmptyStateProps) {
  const text = kind === 'library' ? 'Nenhuma mídia enviada ainda.' : kind === 'deleted' ? 'Nenhuma mídia na lixeira.' : 'Nenhuma mídia encontrada com esses filtros.';
  return <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-14 text-center"><Images className="mx-auto h-10 w-10 text-zinc-400" /><p className="mt-4 font-bold">{text}</p>{kind === 'library' ? <Link to={ROUTES.admin.mediaUpload} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-black px-5 text-sm font-bold text-white"><Upload className="mr-2 h-4 w-4" />Enviar arquivos</Link> : kind === 'filters' ? <button type="button" onClick={onClear} className="mt-5 min-h-11 rounded-xl border border-zinc-300 px-5 text-sm font-bold hover:bg-white"><RotateCcw className="mr-2 inline h-4 w-4" />Limpar filtros</button> : null}</div>;
}
