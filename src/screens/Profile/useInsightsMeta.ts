// Apple redesign: bounded, persistent metadata aggregation for the Insights tab.
// Library rows carry no genres/runtimes, so the Top genre and Time watched tiles are
// filled lazily from TMDB details/season data. Rules for this aggregation (main, 25 Nov):
// one small hard network budget per run covering details + progress + season fetches,
// persistent (AsyncStorage) and react-query caches reused before any request, no polling,
// private progress scoped to the stable account id and reset on switch/logout, late
// responses from a previous account discarded, and partial results always render their
// coverage - nothing here suggests completeness. The testable rules live in
// insightsMetaCore.ts; this hook is the async shell around them.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getMovieDetails } from '../../api/movies';
import { STALE_TIME } from '../../api/queries';
import { getSeasonEpisodes, getTVDetails } from '../../api/tv';
import { Episode, MovieDetails, TVDetails } from '../../api/types';
import { LibraryItem, veloraApi } from '../../api/velora';
import {
  applyProgress,
  clearOwner,
  computeInsights,
  emptyMetaState,
  ensureOwner,
  InsightsMeta,
  needsProgressFetch,
  Persisted,
} from './insightsMetaCore';

const STORAGE_KEY = 'insights_meta_v1';
// Hard cap on actual network requests per aggregation run; every details, progress and
// season fetch counts. Cache hits (persistent map or fresh react-query data) cost nothing.
const REQUEST_BUDGET = 10;

const keyOf = (item: LibraryItem) => `${item.media_type}:${item.tmdb_id}`;

// Server timestamps are UTC "YYYY-MM-DD HH:MM:SS" (datetime('now')).
const parseServerTime = (v: string): number => {
  const t = Date.parse(v.includes('T') ? v : v.replace(' ', 'T') + 'Z');
  return isNaN(t) ? NaN : t;
};

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

export function useInsightsMeta(
  allItems: LibraryItem[],
  enabled: boolean,
  apiReady: boolean,
  /** Stable account id (user.id, not the mutable username); undefined when signed out. */
  accountId: string | undefined,
): InsightsMeta {
  const queryClient = useQueryClient();
  const [cache, setCache] = useState<Persisted>({ titles: {}, seasons: {} });
  const [watchedEpsVersion, setWatchedEpsVersion] = useState(0);
  const stateRef = useRef({ meta: emptyMetaState(), loaded: false, running: false });
  // One bounded run per Insights activation; never a poll or a render-driven loop.
  const activatedRef = useRef(false);
  useEffect(() => {
    if (!enabled) activatedRef.current = false;
  }, [enabled]);
  useEffect(() => {
    // A different signed-in account gets its own fresh run.
    activatedRef.current = false;
  }, [accountId]);

  // Sign-out cleanup: no account owns private progress anymore.
  useEffect(() => {
    if (apiReady && accountId) return;
    if (clearOwner(stateRef.current.meta)) setWatchedEpsVersion(v => v + 1);
  }, [apiReady, accountId]);

  useEffect(() => {
    if (!enabled || !apiReady || !accountId || allItems.length === 0) return;
    if (activatedRef.current) return;
    const s = stateRef.current;
    if (s.running) return; // a prior run is still settling; a later activation starts ours
    activatedRef.current = true;
    s.running = true;
    let cancelled = false;
    // Account switch drops the previous account's private progress before anything runs.
    if (ensureOwner(s.meta, accountId)) setWatchedEpsVersion(v => v + 1);
    // Late async responses are only applied while this account still owns the state.
    const runOwner = accountId;
    const alive = () => !cancelled && s.meta.owner === runOwner;

    const publish = () => {
      if (!alive()) return;
      setCache({ titles: { ...s.meta.cache.titles }, seasons: { ...s.meta.cache.seasons } });
      setWatchedEpsVersion(v => v + 1);
    };
    const fresh = (key: unknown[]) => {
      const st = queryClient.getQueryState(key);
      return !!st?.data && Date.now() - (st.dataUpdatedAt || 0) < STALE_TIME;
    };

    (async () => {
      try {
      if (!s.loaded) {
        s.meta.cache = await loadPersisted();
        if (!alive()) return;
        s.loaded = true;
        // Seed from the react-query cache: details fetched during normal browsing already
        // carry genres/runtime, so those titles need no request at all. (Public metadata.)
        for (const [key, data] of queryClient.getQueriesData<MovieDetails>({ queryKey: ['movie_details'] })) {
          const id = key[1] as number;
          if (data && !s.meta.cache.titles[`movie:${id}`]) {
            s.meta.cache.titles[`movie:${id}`] = { g: (data.genres ?? []).map(g => g.id), r: data.runtime || undefined };
          }
        }
        for (const [key, data] of queryClient.getQueriesData<TVDetails>({ queryKey: ['tv_details'] })) {
          const id = key[1] as number;
          if (data && !s.meta.cache.titles[`tv:${id}`]) {
            s.meta.cache.titles[`tv:${id}`] = { g: (data.genres ?? []).map(g => g.id) };
          }
        }
        publish();
      }

      let budget = REQUEST_BUDGET;

      // 1) Details for unknown titles, watched first (they feed both tiles).
      const ordered = [...allItems].sort((a, b) =>
        a.status === b.status ? 0 : a.status === 'watched' ? -1 : b.status === 'watched' ? 1 : 0);
      for (const item of ordered) {
        if (!alive()) return;
        const k = keyOf(item);
        if (s.meta.cache.titles[k]) continue;
        const qk = item.media_type === 'movie' ? ['movie_details', item.tmdb_id] : ['tv_details', item.tmdb_id];
        if (fresh(qk)) {
          const d = queryClient.getQueryData<MovieDetails | TVDetails>(qk);
          if (d) {
            s.meta.cache.titles[k] = {
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
          if (!alive()) return;
          s.meta.cache.titles[k] = {
            g: (d.genres ?? []).map(g => g.id),
            r: item.media_type === 'movie' ? (d as MovieDetails).runtime || undefined : undefined,
          };
          publish();
        } catch {
          // Left unknown; a later run retries within its own budget.
        }
      }

      // 2) Watched series: recorded episode progress, then runtimes for those seasons.
      //    Progress refetches whenever the library row version (updated_at) changed -
      //    the server bumps it on every watch/unwatch, so same-count toggles refresh too.
      const watchedSeries = allItems.filter(i => i.media_type === 'tv' && i.episodes_watched > 0);
      for (const item of watchedSeries) {
        if (!alive()) return;
        if (needsProgressFetch(s.meta, item)) {
          const qk = ['epProgress', item.tmdb_id];
          // Reuse the shared cache only when it provably covers the latest server-side
          // mutation (its write is newer than the library row version). An age-fresh
          // cache that predates a mutation must NOT feed Insights: force a real
          // refetch (staleTime 0), budget-counted like any other request.
          const st = queryClient.getQueryState(qk);
          const versionTime = parseServerTime(item.updated_at);
          if (st?.data && !isNaN(versionTime) && st.dataUpdatedAt >= versionTime) {
            const d = st.data as { watched: { season: number; episode: number }[] };
            applyProgress(s.meta, runOwner, item.tmdb_id, d?.watched ?? [], item.updated_at);
          } else {
            if (budget <= 0) break;
            budget--;
            try {
              const d = await queryClient.fetchQuery({
                queryKey: qk,
                queryFn: () => veloraApi.getEpisodeProgress(item.tmdb_id),
                staleTime: 0,
              });
              // Discarded silently when the account changed mid-flight.
              if (applyProgress(s.meta, runOwner, item.tmdb_id, d.watched ?? [], item.updated_at)) publish();
            } catch {
              continue;
            }
          }
        }
        const seasons = [...new Set((s.meta.watchedEps[item.tmdb_id] ?? []).map(w => w.season))];
        for (const season of seasons) {
          if (!alive()) return;
          const sk = `${item.tmdb_id}:${season}`;
          if (s.meta.cache.seasons[sk]) continue;
          const qk = ['tv_season_episodes', item.tmdb_id, season];
          if (fresh(qk)) {
            const eps = queryClient.getQueryData<Episode[]>(qk) ?? [];
            s.meta.cache.seasons[sk] = Object.fromEntries(eps.map(e => [e.episode_number, e.runtime ?? 0]));
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
            if (!alive()) return;
            s.meta.cache.seasons[sk] = Object.fromEntries(eps.map(e => [e.episode_number, e.runtime ?? 0]));
            publish();
          } catch {
            // Left unknown; a later run retries.
          }
        }
      }

      if (!alive()) return;
      try {
        // Only public TMDB metadata is persisted; private progress stays in memory.
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s.meta.cache));
      } catch {
        // Persistence is best-effort; the in-memory map still serves this session.
      }
      publish();
      } finally {
        // Also on early aborts (account switch, unmount): the next activation of any
        // account must be allowed to start its own bounded run.
        s.running = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, apiReady, accountId, allItems, queryClient]);

  const s = stateRef.current;
  // watchedEpsVersion re-renders the memo when private progress changes.
  void watchedEpsVersion;
  return useMemo(
    () => computeInsights(allItems, s.meta.cache, s.meta.watchedEps, s.meta.owner === accountId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allItems, cache, watchedEpsVersion, accountId],
  );
}
