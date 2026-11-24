import type { LibraryItem } from '../../api/velora';

export interface SeriesProgress { watched: number; total: number; left: number; fraction: number }

/**
 * Tracked progress for a series card. Uses only stored data: episodes_watched (rows actually saved) and
 * total_episodes (TMDB count saved with the title). Unknown total (0) or a want/movie item shows nothing,
 * so no completion is ever invented. Episodes Must marked watched but the import withheld count as not saved.
 */
export function seriesProgress(item: Pick<LibraryItem, 'media_type' | 'status' | 'episodes_watched' | 'total_episodes'>): SeriesProgress | null {
  if (item.media_type !== 'tv' || item.status === 'want') return null;
  const total = item.total_episodes;
  if (!(total > 0)) return null;
  const watched = Math.min(Math.max(item.episodes_watched, 0), total);
  return { watched, total, left: total - watched, fraction: watched / total };
}

/** TMDB status that means the series ended (the user's rule: ended and all watched). Canceled stays neutral. */
export function isEndedStatus(status: string | undefined | null): boolean {
  return status === 'Ended';
}

/**
 * Completion tick: only when TMDB says the series ended AND every one of TMDB's episodes is saved as watched.
 * Unknown status (not loaded / failed), an ongoing series that is caught up, or a count mismatch never ticks.
 */
export function isEndedComplete(
  prog: SeriesProgress | null,
  tmdb: { status?: string | null; number_of_episodes?: number | null } | undefined,
): boolean {
  if (!prog || !tmdb || !isEndedStatus(tmdb.status)) return false;
  const denom = Math.max(prog.total, Number(tmdb.number_of_episodes ?? 0));
  return denom > 0 && prog.watched >= denom;
}
