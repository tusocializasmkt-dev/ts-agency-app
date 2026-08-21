import type { Brand } from '../../types';
import type { MediaAsset } from '../../media';
import MediaCard from './MediaCard';

interface MediaGridProps { media: MediaAsset[]; brands: Brand[]; onView: (asset: MediaAsset) => void; onDelete: (asset: MediaAsset) => void; onRestore: (asset: MediaAsset) => void; }
export default function MediaGrid({ media, brands, onView, onDelete, onRestore }: MediaGridProps) {
  const names = new Map(brands.map(brand => [brand.id, brand.name]));
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Mídias encontradas">{media.map(asset => <MediaCard key={asset.id} asset={asset} brandName={names.get(asset.brandId) ?? 'Cliente indisponível'} onView={onView} onDelete={onDelete} onRestore={onRestore} />)}</div>;
}
