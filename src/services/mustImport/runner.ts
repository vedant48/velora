import { proxyGet } from '../../api/client';
import { storage } from '../../storage/storage';
import { chooseMatch } from './match';
import { MatchResult, MustItem, TmdbCandidate } from './types';

const CACHE_KEY = 'velora.mustImport.matches.v1';

function yearOf(d?: string | null): number | null {
  const m = /^(\d{4})/.exec(d ?? '');
  return m ? Number(m[1]) : null;
}

function toCandidate(r: any, type: 'movie' | 'tv'): TmdbCandidate {
  const date = type === 'movie' ? r.release_date : r.first_air_date;
  return {
    id: r.id,
    title: (type === 'movie' ? r.title : r.name) ?? '',
    originalTitle: (type === 'movie' ? r.original_title : r.original_name) ?? '',
    year: yearOf(date),
    releaseDate: date || null,
    posterPath: r.poster_path ?? null,
    backdropPath: r.backdrop_path ?? null,
    popularity: r.popularity ?? 0,
  };
}

async function search(item: MustItem): Promise<TmdbCandidate[]> {
  const path = item.type === 'movie' ? 'movie' : 'tv';
  const q = encodeURIComponent(item.title);
  const yearParam = item.year ? `&${item.type === 'movie' ? 'year' : 'first_air_date_year'}=${item.year}` : '';
  let data = await proxyGet<{ results?: any[] }>(`/v1/tmdb/3/search/${path}?query=${q}${yearParam}`, { timeoutMs: 20000 });
  let results = data.results ?? [];
  if (results.length === 0 && yearParam) {
    data = await proxyGet<{ results?: any[] }>(`/v1/tmdb/3/search/${path}?query=${q}`, { timeoutMs: 20000 });
    results = data.results ?? [];
  }
  return results.map((r) => toCandidate(r, item.type));
}

export interface MatchProgress { done: number; total: number }

/**
 * Match Must titles to TMDB. A small worker pool keeps the load on the TMDB proxy modest, results are
 * cached on the device so a second run does not repeat searches, and a failed search leaves the title
 * unmatched (retryable) instead of guessing.
 */
export async function matchAll(
  items: MustItem[],
  onProgress: (p: MatchProgress) => void,
  signal?: { cancelled: boolean },
): Promise<Map<string, MatchResult & { failed?: boolean }>> {
  const cache = await storage.getItem<Record<string, TmdbCandidate[]>>(CACHE_KEY, {});
  const out = new Map<string, MatchResult & { failed?: boolean }>();
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (!signal?.cancelled) {
      const i = next++;
      if (i >= items.length) return;
      const item = items[i];
      const key = `${item.type}:${item.mustId}:${item.title}:${item.year ?? ''}`;
      try {
        let cands = cache[key];
        if (!cands) {
          cands = await search(item);
          cache[key] = cands;
        }
        out.set(item.mustId, chooseMatch(item, cands));
      } catch {
        out.set(item.mustId, { confidence: 'none', best: null, candidates: [], reason: 'TMDB lookup failed, try again', failed: true });
      }
      done++;
      if (done % 10 === 0 || done === items.length) onProgress({ done, total: items.length });
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  await storage.setItem(CACHE_KEY, cache);
  return out;
}

export async function tmdbSeasonCheck(tmdbId: number): Promise<{ tmdbCounts: Record<number, number>; totalEpisodes: number } | null> {
  try {
    const d = await proxyGet<any>(`/v1/tmdb/3/tv/${tmdbId}`, { timeoutMs: 20000 });
    const counts: Record<number, number> = {};
    let total = 0;
    for (const s of d.seasons ?? []) {
      counts[s.season_number] = s.episode_count;
      if (s.season_number >= 1) total += s.episode_count;
    }
    return { tmdbCounts: counts, totalEpisodes: total || d.number_of_episodes || 0 };
  } catch {
    return null;
  }
}
