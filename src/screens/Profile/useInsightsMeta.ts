// Apple redesign: bounded, persistent metadata aggregation for the Insights tab.
// Library rows carry no genres/runtimes, so the Top genre and Time watched tiles are
// filled lazily from TMDB details/season data. Rules for this aggregation (main, 25 Nov):
// one small hard network budget per run covering details + progress + season fetches,
// persistent (AsyncStorage) and react-query caches reused before any request, no polling,
// and partial results always render their coverage - nothing here suggests completeness.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MOVIE_GENRES, TV_GENRES } from '../../api/genres';
import { getMovieDetails } from '../../api/movies';
import { STALE_TIME } from '../../api/queries';
import { getSeasonEpisodes, getTVDetails } from '../../api/tv';
import { Episode, MovieDetails, TVDetails } from '../../api/types';
import { LibraryItem, veloraApi } from '../../api/velora';

const STORAGE_KEY = 'insights_meta_v1';
// Hard cap on actual network requests per aggregation run; every details, progress and
// season fetch counts. Cache hits (persistent map or fresh react-query data) cost nothing.
const REQUEST_BUDGET = 10;

interface TitleMeta {
  /** Genre ids from TMDB details; empty array means "fetched, none listed". */
  g: number[];
  /** Movie runtime in minutes; absent when TMDB lists none. Only set for movies. */
  r?: number;
}
/** episode_number -> minutes; an existing key means the season was fetched. */
type SeasonRuntimes = Record<number, number>;
interface Persisted {
  titles: Record<string, TitleMeta>;
  seasons: Record<string, SeasonRuntimes>;
}
type WatchedEps = Record<number, { season: number; episode: number }[]>;

const keyOf = (item: LibraryItem) => `${item.media_type}:${item.tmdb_id}`;

async function loadPersisted(): Promise<Persisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { titles: parsed.titles ?? {}, seasons: parsed.seasons ?? {} };
    }
  } catch {
    // Corrupt or unreadable cache: start empty, network results repopulate it.
  }
  return { titles: {}, seasons: {} };
}

export interface InsightsMeta {
  topGenre?: { name: string; known: number; total: number };
  timeWatched?: {
    minutes: number;
    moviesKnown: number;
    moviesTotal: number;
    epsKnown: number;
    epsTotal: number;
  };
}

export function useInsightsMeta(allItems: LibraryItem[], enabled: boolean, apiReady: boolean): InsightsMeta {
  const queryClient = useQueryClient();
  const [cache, setCache] = useState<Persisted>({ titles: {}, seasons: {} });
  const [watchedEps, setWatchedEps] = useState<WatchedEps>({});
  const stateRef = useRef({
    cache: { titles: {}, seasons: {} } as Persisted,
    watchedEps: {} as WatchedEps,
    loaded: false,
    running: false,
  });
  // One bounded run per Insights activation; never a poll or a render-driven loop.
  const activatedRef = useRef(false);
  useEffect(() => {
    if (!enabled) activatedRef.current = false;
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !apiReady || allItems.length === 0) return;
    if (activatedRef.current) return;
    activatedRef.current = true;
    const s = stateRef.current;
    if (s.running) return;
    s.running = true;
    let cancelled = false;

    const publish = () => {
      if (cancelled) return;
      setCache({ titles: { ...s.cache.titles }, seasons: { ...s.cache.seasons } });
      setWatchedEps({ ...s.watchedEps });
    };
    const fresh = (key: unknown[]) => {
      const st = queryClient.getQueryState(key);
      return !!st?.data && Date.now() - (st.dataUpdatedAt || 0) < STALE_TIME;
    };

    (async () => {
      if (!s.loaded) {
        s.cache = await loadPersisted();
        s.loaded = true;
        // Seed from the react-query cache: details fetched during normal browsing already
        // carry genres/runtime, so those titles need no request at all.
        for (const [key, data] of queryClient.getQueriesData<MovieDetails>({ queryKey: ['movie_details'] })) {
          const id = key[1] as number;
          if (data && !s.cache.titles[`movie:${id}`]) {
            s.cache.titles[`movie:${id}`] = { g: (data.genres ?? []).map(g => g.id), r: data.runtime || undefined };
          }
        }
        for (const [key, data] of queryClient.getQueriesData<TVDetails>({ queryKey: ['tv_details'] })) {
          const id = key[1] as number;
          if (data && !s.cache.titles[`tv:${id}`]) {
            s.cache.titles[`tv:${id}`] = { g: (data.genres ?? []).map(g => g.id) };
          }
        }
        publish();
      }

      let budget = REQUEST_BUDGET;

      // 1) Details for unknown titles, watched first (they feed both tiles).
      const ordered = [...allItems].sort((a, b) =>
        a.status === b.status ? 0 : a.status === 'watched' ? -1 : b.status === 'watched' ? 1 : 0);
      for (const item of ordered) {
        if (cancelled) return;
        const k = keyOf(item);
        if (s.cache.titles[k]) continue;
        const qk = item.media_type === 'movie' ? ['movie_details', item.tmdb_id] : ['tv_details', item.tmdb_id];
        if (fresh(qk)) {
          const d = queryClient.getQueryData<MovieDetails | TVDetails>(qk);
          if (d) {
            s.cache.titles[k] = {
              g: (d.genres ?? []).map(g => g.id),
              r: item.media_type === 'movie' ? (d as MovieDetails).runtime || undefined : undefined,
            };
          }
          continue;
        }
        if (budget <= 0) break;
        budget--;
        try {
          const d = await queryClient.fetchQuery<MovieDetails | TVDetails>({
            queryKey: qk,
            queryFn: ({ signal }) =>
              item.media_type === 'movie' ? getMovieDetails(item.tmdb_id, signal) : getTVDetails(item.tmdb_id, signal),
            staleTime: STALE_TIME,
          });
          s.cache.titles[k] = {
            g: (d.genres ?? []).map(g => g.id),
            r: item.media_type === 'movie' ? (d as MovieDetails).runtime || undefined : undefined,
          };
          publish();
        } catch {
          // Left unknown; a later run retries within its own budget.
        }
      }

      // 2) Watched series: recorded episode progress, then runtimes for those seasons.
      const watchedSeries = allItems.filter(i => i.media_type === 'tv' && i.episodes_watched > 0);
      for (const item of watchedSeries) {
        if (cancelled) return;
        if (!s.watchedEps[item.tmdb_id]) {
          const qk = ['epProgress', item.tmdb_id];
          if (fresh(qk)) {
            const d = queryClient.getQueryData<{ watched: { season: number; episode: number }[] }>(qk);
            s.watchedEps[item.tmdb_id] = d?.watched ?? [];
          } else {
            if (budget <= 0) break;
            budget--;
            try {
              const d = await queryClient.fetchQuery({
                queryKey: qk,
                queryFn: () => veloraApi.getEpisodeProgress(item.tmdb_id),
                staleTime: STALE_TIME,
              });
              s.watchedEps[item.tmdb_id] = d.watched ?? [];
              publish();
            } catch {
              continue;
            }
          }
        }
        const seasons = [...new Set((s.watchedEps[item.tmdb_id] ?? []).map(w => w.season))];
        for (const season of seasons) {
          if (cancelled) return;
          const sk = `${item.tmdb_id}:${season}`;
          if (s.cache.seasons[sk]) continue;
          const qk = ['tv_season_episodes', item.tmdb_id, season];
          if (fresh(qk)) {
            const eps = queryClient.getQueryData<Episode[]>(qk) ?? [];
            s.cache.seasons[sk] = Object.fromEntries(eps.map(e => [e.episode_number, e.runtime ?? 0]));
            continue;
          }
          if (budget <= 0) break;
          budget--;
          try {
            const eps = await queryClient.fetchQuery({
              queryKey: qk,
              queryFn: ({ signal }) => getSeasonEpisodes(item.tmdb_id, season, signal),
              staleTime: STALE_TIME,
            });
            s.cache.seasons[sk] = Object.fromEntries(eps.map(e => [e.episode_number, e.runtime ?? 0]));
            publish();
          } catch {
            // Left unknown; a later run retries.
          }
        }
      }

      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s.cache));
      } catch {
        // Persistence is best-effort; the in-memory map still serves this session.
      }
      publish();
      s.running = false;
    })();

    return () => {
      cancelled = true;
      s.running = false;
    };
  }, [enabled, apiReady, allItems, queryClient]);

  return useMemo(() => {
    // Top genre: most common primary genre among titles whose genres are known.
    // The tile always renders its coverage (known of total) and stays hidden until
    // a meaningful floor of known titles exists.
    let known = 0;
    const tally = new Map<string, number>();
    for (const item of allItems) {
      const meta = cache.titles[keyOf(item)];
      if (!meta || meta.g.length === 0) continue;
      const map = item.media_type === 'tv' ? TV_GENRES : MOVIE_GENRES;
      const primary = meta.g.map(id => map[id]).find(Boolean);
      if (!primary) continue;
      known++;
      tally.set(primary, (tally.get(primary) ?? 0) + 1);
    }
    let topGenre: InsightsMeta['topGenre'];
    if (known >= 5 && tally.size > 0) {
      const name = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
      topGenre = { name, known, total: allItems.length };
    }

    // Time watched: minutes we can verify - known movie runtimes plus known runtimes
    // of recorded watched episodes. Coverage counts render on the tile.
    const watchedMovies = allItems.filter(i => i.media_type === 'movie' && i.status === 'watched');
    let minutes = 0;
    let moviesKnown = 0;
    for (const m of watchedMovies) {
      const r = cache.titles[keyOf(m)]?.r;
      if (r) {
        minutes += r;
        moviesKnown++;
      }
    }
    const watchedSeries = allItems.filter(i => i.media_type === 'tv' && i.episodes_watched > 0);
    let epsTotal = 0;
    let epsKnown = 0;
    for (const series of watchedSeries) {
      epsTotal += series.episodes_watched;
      for (const w of watchedEps[series.tmdb_id] ?? []) {
        const rt = cache.seasons[`${series.tmdb_id}:${w.season}`]?.[w.episode];
        if (rt) {
          minutes += rt;
          epsKnown++;
        }
      }
    }
    let timeWatched: InsightsMeta['timeWatched'];
    if (minutes > 0 && moviesKnown + epsKnown >= 3) {
      timeWatched = { minutes, moviesKnown, moviesTotal: watchedMovies.length, epsKnown, epsTotal };
    }
    return { topGenre, timeWatched };
  }, [allItems, cache, watchedEps]);
}
