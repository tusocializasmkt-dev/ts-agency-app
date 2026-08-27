import type { Brand } from '../../types';
import type { MediaAsset } from '../../media';
import MediaCard from './MediaCard';

interface MediaGridProps { media: MediaAsset[]; brands: Brand[]; canManage: boolean; downloadingId: string | null; onView: (asset: MediaAsset) => void; onDownload: (asset: MediaAsset) => void; onDelete: (asset: MediaAsset) => void; onRestore: (asset: MediaAsset) => void; }
export default function MediaGrid({ media, brands, canManage, downloadingId, onView, onDownload, onDelete, onRestore }: MediaGridProps) {
  const names = new Map(brands.map(brand => [brand.id, brand.name]));
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Mídias encontradas">{media.map(asset => <MediaCard key={asset.id} asset={asset} brandName={names.get(asset.brandId) ?? 'Cliente indisponível'} canManage={canManage} downloading={downloadingId === asset.id} onView={onView} onDownload={onDownload} onDelete={onDelete} onRestore={onRestore} />)}</div>;
}
