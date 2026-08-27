import { MediaLibrary } from '../../components/media';

export default function ClientMediaLibraryPage() {
  return <div className="space-y-8">
    <header>
      <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Mídias</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Biblioteca da sua empresa</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base">Visualize e baixe os materiais disponibilizados pela agência.</p>
    </header>
    <MediaLibrary />
  </div>;
}
