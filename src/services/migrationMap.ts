import type { MediaItem } from '../api/types';
import type { MediaType } from '../api/velora';

export interface ImportItem {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  status: 'want';
}

/**
 * Pure mapping from a legacy local watchlist entry (v1.1.0 AsyncStorage
 * `@velora_watchlist`, an array of TMDB MediaItems) to the server import
 * shape. Kept dependency-free so the exact app code path can be exercised
 * outside the app (proof harness runs it in plain node against the live API).
 */
export function localWatchlistToImport(items: MediaItem[]): ImportItem[] {
  return (items ?? [])
    .filter(
      (i) =>
        i != null &&
        typeof i.id === 'number' &&
        (i.media_type === 'movie' || i.media_type === 'tv'),
    )
    .map((i) => ({
      mediaType: i.media_type as MediaType,
      tmdbId: i.id,
      // TV search results carry `name`, movies carry `title`.
      title: (i.title ?? (i as { name?: string }).name ?? '').toString(),
      posterPath: i.poster_path ?? null,
      backdropPath: i.backdrop_path ?? null,
      releaseDate: i.release_date ?? null,
      status: 'want' as const,
    }));
}
