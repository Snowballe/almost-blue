import {useEffect} from 'react';
import {sectors} from '../data/sectors';
import {useSectorsStore} from '../stores/useSectorsStore';
import {getCachedForecast} from '../services/openMeteo';

/**
 * Warm up the in-memory forecast cache for every favourite sector.
 * Fires on mount and whenever the favourites list changes.
 * All fetches are fire-and-forget — failures are silent and non-blocking.
 * getCachedForecast already deduplicates in-flight requests, so concurrent
 * callers (e.g. MapScreen) share the same promise.
 */
export function usePrefetchFavorites(): void {
  const favoriteIds = useSectorsStore(s => s.favoriteIds);

  useEffect(() => {
    sectors
      .filter(s => favoriteIds.includes(s.id))
      .forEach(s => {
        getCachedForecast(s.latitude, s.longitude).catch(() => {});
      });
  }, [favoriteIds]);
}
