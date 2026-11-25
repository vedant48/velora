// Pure logic for the Insights metadata aggregation, split from useInsightsMeta so the
// account-isolation, freshness and coverage rules are unit-testable without React.
// Invariants (main, 25 Nov): private watched progress is owned by one account id and
// dropped on switch or logout; a late async response from a previous account can never
// write into the new account's state; progress refetches on any library-row version
// change (the server bumps updated_at on every watch/unwatch, including same-count
// toggles); only verified minutes and known genres are ever counted, with coverage.
import { MOVIE_GENRES, TV_GENRES } from '../../api/genres';
import type { LibraryItem } from '../../api/velora';

export interface TitleMeta {
  /** Genre ids from TMDB details; empty array means "fetched, none listed". */
  g: number[];
  /** Movie runtime in minutes; absent when TMDB lists none. Only set for movies. */
  r?: number;
}
/** episode_number -> minutes; an existing key means the season was fetched. */
export type SeasonRuntimes = Record<number, number>;
export interface Persisted {
  titles: Record<string, TitleMeta>;
  seasons: Record<string, SeasonRuntimes>;
}
export type WatchedEps = Record<number, { season: number; episode: number }[]>;

export interface MetaState {
  /** Public TMDB metadata only (genres, runtimes) - safe to persist and to share
      across accounts on the same device. */
  cache: Persisted;
  /** Private: recorded watched episodes of the owning account. Never persisted. */
  watchedEps: WatchedEps;
  /** Private: library updated_at seen at the last progress fetch per series. */
  epVersionSeen: Record<number, string>;
  /** Stable account id (user id, not the mutable username) owning the private state. */
  owner?: string;
}

export const emptyMetaState = (): MetaState => ({
  cache: { titles: {}, seasons: {} },
  watchedEps: {},
  epVersionSeen: {},
});

/** Drop private progress when the signed-in account changes. Returns true when it did. */
export function ensureOwner(state: MetaState, ownerId: string): boolean {
  if (state.owner === ownerId) return false;
  state.owner = ownerId;
  state.watchedEps = {};
  state.epVersionSeen = {};
  return true;
}

/** Signed out: no account owns the private state. Returns true when it reset. */
export function clearOwner(state: MetaState): boolean {
  if (state.owner === undefined &&
      Object.keys(state.watchedEps).length === 0 &&
      Object.keys(state.epVersionSeen).length === 0) {
    return false;
  }
  state.owner = undefined;
  state.watchedEps = {};
  state.epVersionSeen = {};
  return true;
}

/** Progress must be refetched when the library row's version changed since the last
    fetch; updated_at moves on every watch/unwatch, so equal counts cannot hide toggles. */
export function needsProgressFetch(state: MetaState, item: LibraryItem): boolean {
  return state.epVersionSeen[item.tmdb_id] !== item.updated_at;
}

/** Record a progress fetch result. forOwner is the account the fetch was started under;
    if the owning account changed mid-flight, the late response is discarded. */
export function applyProgress(
  state: MetaState,
  forOwner: string,
  tmdbId: number,
  watched: { season: number; episode: number }[],
  version: string,
): boolean {
  if (state.owner !== forOwner) return false;
  state.watchedEps[tmdbId] = watched;
  state.epVersionSeen[tmdbId] = version;
  return true;
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

const keyOf = (item: LibraryItem) => `${item.media_type}:${item.tmdb_id}`;

// Tiles hide below meaningful floors rather than presenting thin data as insight.
const MIN_GENRE_KNOWN = 5;
const MIN_TIME_UNITS = 3;

export function computeInsights(
  allItems: LibraryItem[],
  cache: Persisted,
  watchedEps: WatchedEps,
  /** False when the progress data belongs to a different (previous) account. */
  progressOwnerOk: boolean,
): InsightsMeta {
  // Top genre: most common PRIMARY genre (TMDB's first-listed genre) among titles
  // whose genres are known, across the whole tracked library.
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
  if (known >= MIN_GENRE_KNOWN && tally.size > 0) {
    const name = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
    topGenre = { name, known, total: allItems.length };
  }

  // Time watched: verified minutes only - known movie runtimes plus known runtimes of
  // recorded watched episodes. Unknown runtimes are excluded, never estimated.
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
  const ownerEps = progressOwnerOk ? watchedEps : {};
  for (const series of watchedSeries) {
    epsTotal += series.episodes_watched;
    for (const w of ownerEps[series.tmdb_id] ?? []) {
      const rt = cache.seasons[`${series.tmdb_id}:${w.season}`]?.[w.episode];
      if (rt) {
        minutes += rt;
        epsKnown++;
      }
    }
  }
  let timeWatched: InsightsMeta['timeWatched'];
  if (minutes > 0 && moviesKnown + epsKnown >= MIN_TIME_UNITS) {
    timeWatched = { minutes, moviesKnown, moviesTotal: watchedMovies.length, epsKnown, epsTotal };
  }
  return { topGenre, timeWatched };
}
