import { Link } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { ROUTES } from '../../app/router/routes';
import { MediaLibrary } from '../../components/media';

export default function AdminMediaLibraryPage() {
  return <div className="space-y-8"><header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Mídias</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Biblioteca de mídias</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base">Encontre, visualize e organize os arquivos enviados para seus clientes.</p></div><Link to={ROUTES.admin.mediaUpload} className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-black px-5 text-sm font-bold text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"><Upload className="mr-2 h-4 w-4" />Enviar arquivos</Link></header><MediaLibrary /></div>;
}
