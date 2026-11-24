import { MustItem, TmdbCandidate } from './types';

export interface SeasonCheck {
  /** TMDB episode counts by season number; null when TMDB details could not be read. */
  tmdbCounts: Record<number, number> | null;
  totalEpisodes: number;
}

export interface CommitItem {
  mustId: string;
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  status: string;
  rating: number | null;
  review: { body: string } | null;
  sourceModifiedAt: string | null;
  totalEpisodes: number;
  seasons: { season: number; rating: number | null; review: string | null; watchedEpisodes: number[] }[];
}

export interface Gap {
  mustId: string;
  title: string;
  note: string;
}

/**
 * Build the merge payload for one matched title. Episode rows are only sent for seasons whose episode
 * count equals TMDB's count; a mismatch is reported as a gap instead of guessing which episode is which.
 */
export function buildCommitItem(item: MustItem, tmdb: TmdbCandidate, check?: SeasonCheck): { entry: CommitItem; gaps: Gap[] } {
  const gaps: Gap[] = [];
  const seasons: CommitItem['seasons'] = [];
  if (item.type === 'tv') {
    if (item.seasons === null) {
      if (item.status !== 'want') {
        gaps.push({ mustId: item.mustId, title: item.title, note: 'Added without episode progress: the file has no season data for this show.' });
      }
    } else {
      for (const s of item.seasons) {
        let eps: number[] = s.watchedEpisodes;
        if (eps.length > 0) {
          const tmdbCount = check?.tmdbCounts?.[s.number];
          if (tmdbCount === undefined || tmdbCount !== s.episodeCount) {
            gaps.push({
              mustId: item.mustId,
              title: item.title,
              note: `Season ${s.number}: ${eps.length} watched episodes not imported (Must lists ${s.episodeCount} episodes, TMDB ${tmdbCount ?? 'unknown'}).`,
            });
            eps = [];
          }
        }
        if (s.number >= 1 && (eps.length > 0 || s.rating !== null || s.review)) {
          seasons.push({ season: s.number, rating: s.rating, review: s.review, watchedEpisodes: eps });
        }
      }
    }
    if (item.status === 'want' && item.seasons?.some((s) => s.watchedEpisodes.length > 0)) {
      gaps.push({ mustId: item.mustId, title: item.title, note: 'In Want but has watched episodes in Must; the episodes were kept.' });
    }
  }
  if (!item.releaseDate && !tmdb.releaseDate) gaps.push({ mustId: item.mustId, title: item.title, note: 'No release date in Must or TMDB.' });
  return {
    entry: {
      mustId: item.mustId,
      mediaType: item.type,
      tmdbId: tmdb.id,
      title: tmdb.title || item.title,
      posterPath: tmdb.posterPath ?? item.posterPath,
      backdropPath: tmdb.backdropPath,
      releaseDate: tmdb.releaseDate ?? item.releaseDate,
      status: item.status,
      rating: item.rating,
      review: item.review ? { body: item.review.body } : null,
      sourceModifiedAt: item.modifiedAt,
      totalEpisodes: check?.totalEpisodes ?? 0,
      seasons,
    },
    gaps,
  };
}

/** Split into request-sized batches (server accepts at most 40 titles and 4000 episodes per request). */
export function batchEntries(entries: CommitItem[], maxItems = 25, maxEpisodes = 3000): CommitItem[][] {
  const out: CommitItem[][] = [];
  let cur: CommitItem[] = [];
  let eps = 0;
  for (const e of entries) {
    const n = e.seasons.reduce((a, s) => a + s.watchedEpisodes.length, 0);
    if (cur.length > 0 && (cur.length >= maxItems || eps + n > maxEpisodes)) {
      out.push(cur);
      cur = [];
      eps = 0;
    }
    cur.push(e);
    eps += n;
  }
  if (cur.length) out.push(cur);
  return out;
}
