import { useBrands, useFeedback, useMediaLibrary, useModal } from '../../hooks';
import type { MediaAsset, MediaLibraryFilters } from '../../media';
import MediaDetailsPanel from './MediaDetailsPanel';
import MediaFilters from './MediaFilters';
import MediaGrid from './MediaGrid';
import MediaLibraryEmptyState from './MediaLibraryEmptyState';
import MediaLibrarySkeleton from './MediaLibrarySkeleton';
import MediaPagination from './MediaPagination';
import { useAuth } from '../../contexts/AuthContext';
import { useFileDownload } from '../../hooks';

const defaultFilters: MediaLibraryFilters = { status: 'ready', order: 'newest' };

export default function MediaLibrary() {
  const { role, brandId } = useAuth();
  const canManage = role !== 'client';
  const brandsState = useBrands();
  const library = useMediaLibrary(role === 'client' ? brandId : undefined);
  const fileDownload = useFileDownload();
  const feedback = useFeedback();
  const modal = useModal();
  const brandName = (brandId: string) => brandsState.brands.find(brand => brand.id === brandId)?.name ?? 'Cliente indisponível';

  const remove = async (asset: MediaAsset) => {
    const accepted = await modal.confirm({ title: 'Mover mídia para lixeira?', description: `${asset.originalFileName} deixará de aparecer na biblioteca normal. O arquivo físico será preservado.`, confirmLabel: 'Mover para lixeira', destructive: true });
    if (!accepted) return;
    try { await library.deleteMedia(asset); modal.closeAll(); feedback.success('Mídia movida para a lixeira'); } catch { feedback.error('Não foi possível excluir a mídia'); }
  };
  const restore = async (asset: MediaAsset) => { try { await library.restoreMedia(asset); modal.closeAll(); feedback.success('Mídia restaurada'); } catch { feedback.error('Não foi possível restaurar a mídia'); } };
  const download = async (asset: MediaAsset) => { if (!asset.downloadUrl) return; try { await fileDownload.download(asset.id, asset.downloadUrl, asset.originalFileName); feedback.success('Download iniciado.'); } catch { feedback.error('Não foi possível baixar o arquivo.'); } };
  const view = (asset: MediaAsset) => { library.selectMedia(asset); modal.openModal({ title: 'Detalhes da mídia', size: 'xl', content: <MediaDetailsPanel asset={asset} brandName={brandName(asset.brandId)} canManage={canManage} downloading={fileDownload.downloadingId === asset.id} onClose={() => { library.clearSelection(); modal.closeModal(); }} onDownload={download} onDelete={remove} onRestore={restore} /> }); };
  const clearFilters = () => library.setFilters(defaultFilters);
  const filtered = Boolean(library.filters.brandId || library.filters.type || library.filters.search || (library.filters.status && library.filters.status !== 'ready'));

  return <div className="space-y-6">
    <MediaFilters brands={brandsState.brands} filters={library.filters} onChange={library.setFilters} onClear={clearFilters} showBrandFilter={canManage} showStatusFilter={canManage} />
    {library.loading || brandsState.loading ? <MediaLibrarySkeleton /> : library.error || brandsState.error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center"><p className="font-bold text-red-700">{library.error ?? brandsState.error}</p><button type="button" onClick={library.refresh} className="mt-4 min-h-11 rounded-xl bg-black px-5 text-sm font-bold text-white">Tentar novamente</button></div> : library.media.length ? <><MediaGrid media={library.media} brands={brandsState.brands} canManage={canManage} downloadingId={fileDownload.downloadingId} onView={view} onDownload={download} onDelete={remove} onRestore={restore} /><MediaPagination page={library.page} hasPreviousPage={library.hasPreviousPage} hasNextPage={library.hasNextPage} onPrevious={library.previousPage} onNext={library.nextPage} /></> : <MediaLibraryEmptyState kind={library.filters.status === 'deleted' ? 'deleted' : filtered ? 'filters' : 'library'} onClear={clearFilters} canUpload={canManage} />}
  </div>;
}
