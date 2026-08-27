import { useCallback, useEffect, useMemo, useState } from 'react';
import { MEDIA_LIBRARY_PAGE_SIZE, type MediaAsset, type MediaLibraryFilters } from '../media';
import { filterMedia, listMediaPage, permanentlyDeleteMedia, restoreMedia, softDeleteMedia } from '../services/media.service';
import { useAuth } from '../contexts/AuthContext';

const initialFilters: MediaLibraryFilters = { status: 'ready', order: 'newest' };

export function useMediaLibrary(initialBrandId?: string | null) {
  const { role, brandId: authenticatedBrandId, isTeamMember, brandIds } = useAuth();
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilterState] = useState<MediaLibraryFilters>({ ...initialFilters, brandId: initialBrandId || undefined });
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([undefined]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasNextPage, setHasNextPage] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaAsset | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const cursor = cursorStack.at(-1);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(null);
    listMediaPage({ brandId: role === 'client' ? authenticatedBrandId ?? undefined : filters.brandId, brandIds: isTeamMember ? brandIds : undefined, type: filters.type, status: filters.status, order: filters.order, cursor, pageSize: MEDIA_LIBRARY_PAGE_SIZE })
      .then(result => { if (active) { setMedia(result.items); setNextCursor(result.nextCursor); setHasNextPage(result.hasMore); setLoading(false); } })
      .catch(() => { if (active) { setError('Não foi possível carregar a biblioteca de mídia.'); setLoading(false); } });
    return () => { active = false; };
  }, [cursor, filters.brandId, filters.order, filters.status, filters.type, refreshKey, role, authenticatedBrandId, isTeamMember, brandIds.join('|')]);

  const setFilters = useCallback((next: MediaLibraryFilters | ((current: MediaLibraryFilters) => MediaLibraryFilters)) => {
    setFilterState(current => typeof next === 'function' ? next(current) : next);
    setCursorStack([undefined]); setNextCursor(undefined); setHasNextPage(false);
  }, []);
  const run = useCallback(async (command: () => Promise<void>, message: string) => { setError(null); try { await command(); setSelectedMedia(null); setRefreshKey(value => value + 1); } catch (cause) { setError(message); throw cause; } }, []);

  return {
    media: useMemo(() => filterMedia(media, filters), [media, filters]), loading, error, filters, setFilters,
    page: cursorStack.length, hasNextPage, hasPreviousPage: cursorStack.length > 1,
    nextPage: () => { if (hasNextPage && nextCursor) setCursorStack(current => [...current, nextCursor]); },
    previousPage: () => setCursorStack(current => current.length > 1 ? current.slice(0, -1) : current),
    refresh: () => setRefreshKey(value => value + 1),
    selectedMedia, selectMedia: setSelectedMedia, clearSelection: () => setSelectedMedia(null),
    deleteMedia: (asset: MediaAsset) => run(() => softDeleteMedia(asset.brandId, asset.id), 'Não foi possível mover a mídia para a lixeira.'),
    restoreMedia: (asset: MediaAsset) => run(() => restoreMedia(asset.brandId, asset.id), 'Não foi possível restaurar a mídia.'),
    permanentlyDeleteMedia: (asset: MediaAsset) => run(() => permanentlyDeleteMedia(asset.brandId, asset.id), 'Não foi possível excluir a mídia permanentemente.'),
  };
}
