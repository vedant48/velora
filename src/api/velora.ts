import { API_BASE_URL } from '../config';
import { storage } from '../storage/storage';
import { ApiError } from './client';

const TOKEN_KEY = '@velora_auth_token';

export type MediaType = 'movie' | 'tv';
export type LibraryStatus = 'want' | 'watching' | 'watched';

export interface VeloraUser {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  createdAt: string;
  /** ISO timestamp of the last avatar change; null when the user has no photo. */
  avatarAt: string | null;
}

export interface UserStats {
  watched: number;
  want: number;
  watching: number;
  series: number;
  reviews: number;
  followers: number;
  following: number;
  rank: number;
}

export interface LibraryItem {
  id: string;
  media_type: MediaType;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  status: LibraryStatus;
  rating: number | null;
  /** Series only: more than one season is rated (the card shows the latest rated season plus ..). */
  more_ratings?: number;
  /** A non-empty written review exists (title, or any season for a series). */
  has_review?: number;
  episodes_watched: number;
  total_episodes: number;
  added_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  media_type: MediaType;
  tmdb_id: number;
  season_number: number;
  rating: number | null;
  body: string;
  created_at: string;
  updated_at: string;
  username?: string;
  display_name?: string;
  /** Photo revision marker of the author; null or missing when they have no photo. */
  avatar_at?: string | null;
}

export interface WatchedSeason {
  user_id: string;
  season_number: number;
  episodes: number;
}

export interface ActivityEvent {
  kind: 'library' | 'review';
  media_type: MediaType;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  status: LibraryStatus | null;
  rating: number | null;
  body?: string;
  updated_at: string;
  username: string;
  display_name: string;
}

export interface MatchResult {
  percent: number | null;
  sharedRated: number;
  message?: string;
  with?: { username: string; displayName: string };
}

export async function getToken(): Promise<string | null> {
  return storage.getItem<string | null>(TOKEN_KEY, null);
}

let cachedSessionToken: Promise<string | null> | null = null;

/** Session token, cached process-wide. Reset whenever the token changes
 *  (login/logout/switch), so avatar image loads never use a stale or
 *  previous-session credential. */
export function sessionToken(): Promise<string | null> {
  if (!cachedSessionToken) cachedSessionToken = getToken().catch(() => null);
  return cachedSessionToken;
}

export async function setToken(token: string | null): Promise<void> {
  cachedSessionToken = null;
  await storage.setItem(TOKEN_KEY, token);
}

async function call<T>(
  path: string,
  { method = 'GET', body, timeoutMs = 15000 }: { method?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  const token = await getToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE_URL}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      throw new ApiError((json?.message as string) ?? `Request failed (${res.status})`, res.status, path);
    }
    return json as T;
  } finally {
    clearTimeout(timer);
  }
}

/** URL of a user's avatar image, cache-busted per change. Null when the user has no photo.
 *  avatarAt is an opaque server revision marker (unique per write), used verbatim. */
export function avatarUrl(username: string, avatarAt: string | null | undefined): string | null {
  if (!avatarAt) return null;
  return `${API_BASE_URL}/api/users/${encodeURIComponent(username)}/avatar?v=${encodeURIComponent(avatarAt)}`;
}

export const veloraApi = {
  signup: (username: string, password: string, displayName?: string) =>
    call<{ token: string; user: VeloraUser }>('/auth/signup', { method: 'POST', body: { username, password, displayName } }),
  login: (username: string, password: string) =>
    call<{ token: string; user: VeloraUser }>('/auth/login', { method: 'POST', body: { username, password } }),
  googleLogin: (idToken: string) =>
    call<{ token: string; user: VeloraUser }>('/auth/google', { method: 'POST', body: { idToken } }),
  me: () => call<{ user: VeloraUser }>('/auth/me'),
  updateMe: (patch: { displayName?: string; bio?: string; isPrivate?: boolean }) =>
    call<{ user: VeloraUser; isPrivate: boolean }>('/users/me', { method: 'PATCH', body: patch }),
  deleteMe: () => call<{ deleted: boolean }>('/users/me', { method: 'DELETE' }),
  /** Upload a prepared (cropped + compressed) avatar image.
   *  Accepts any fetchable local URI; the server re-validates the bytes. */
  uploadAvatar: async (imageUri: string): Promise<{ avatarAt: string | null }> => {
    const token = await getToken();
    const fileRes = await fetch(imageUri);
    const blob = await fileRes.blob();
    const res = await fetch(`${API_BASE_URL}/api/users/me/avatar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: blob,
    });
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      throw new ApiError((json?.message as string) ?? `Request failed (${res.status})`, res.status, '/users/me/avatar');
    }
    return json as { avatarAt: string | null };
  },
  removeAvatar: () => call<{ avatarAt: string | null }>('/users/me/avatar', { method: 'DELETE' }),
  getUser: (username: string) =>
    call<{ user: VeloraUser; stats: UserStats | null; isFollowing: boolean; isPrivate?: boolean }>(`/users/${encodeURIComponent(username)}`),
  getUserLibrary: (username: string, status?: LibraryStatus) =>
    call<{ items: LibraryItem[] }>(`/users/${encodeURIComponent(username)}/library${status ? `?status=${status}` : ''}`),
  searchUsers: (q: string) => call<{ users: VeloraUser[] }>(`/users/search?q=${encodeURIComponent(q)}`),

  getLibrary: (status?: LibraryStatus, mediaType?: MediaType) => {
    const params = [status && `status=${status}`, mediaType && `mediaType=${mediaType}`].filter(Boolean).join('&');
    return call<{ items: LibraryItem[] }>(`/library${params ? `?${params}` : ''}`);
  },
  lookup: (refs: { mediaType: MediaType; tmdbId: number }[]) =>
    call<{ states: Record<string, LibraryItem | null> }>('/library/lookup', { method: 'POST', body: { refs } }),
  upsertItem: (item: {
    mediaType: MediaType;
    tmdbId: number;
    title: string;
    posterPath?: string | null;
    backdropPath?: string | null;
    releaseDate?: string | null;
    status: LibraryStatus;
    rating?: number | null;
    episodesWatched?: number;
    totalEpisodes?: number;
  }) =>
    call<LibraryItem>(`/library/${item.mediaType}/${item.tmdbId}`, { method: 'PUT', body: item }),
  patchItem: (mediaType: MediaType, tmdbId: number, patch: Partial<{
    status: LibraryStatus;
    rating: number | null;
    episodesWatched: number;
    totalEpisodes: number;
  }>) => call<LibraryItem>(`/library/${mediaType}/${tmdbId}`, { method: 'PATCH', body: patch }),
  moveToWant: (mediaType: MediaType, tmdbId: number) =>
    call<LibraryItem>(`/library/${mediaType}/${tmdbId}/move-to-want`, { method: 'POST' }),
  getMyReviews: () => call<{ reviews: Review[] }>('/reviews/mine'),
  removeItem: (mediaType: MediaType, tmdbId: number) =>
    call<{ removed: boolean }>(`/library/${mediaType}/${tmdbId}`, { method: 'DELETE' }),

  // Per-episode progress (TV)
  getEpisodeProgress: (tmdbId: number) =>
    call<{ watched: { season: number; episode: number }[] }>(`/library/tv/${tmdbId}/episodes`),
  setEpisodeWatched: (
    tmdbId: number,
    body: {
      season: number;
      episode: number;
      watched?: boolean;
      title?: string;
      posterPath?: string | null;
      backdropPath?: string | null;
      releaseDate?: string | null;
      totalEpisodes?: number;
    },
  ) =>
    call<{ watched: boolean; season: number; episode: number; episodesWatched: number }>(
      `/library/tv/${tmdbId}/episodes`,
      { method: 'PUT', body },
    ),
  setSeasonWatched: (
    tmdbId: number,
    season: number,
    body: {
      watched?: boolean;
      episodes?: number[];
      title?: string;
      posterPath?: string | null;
      backdropPath?: string | null;
      releaseDate?: string | null;
      totalEpisodes?: number;
    },
  ) =>
    call<{ watched: boolean; season: number; episodesWatched: number }>(
      `/library/tv/${tmdbId}/seasons/${season}`,
      { method: 'PUT', body },
    ),

  /** Aggregate per-title counts (public). */
  getTitleStats: (mediaType: MediaType, tmdbId: number) =>
    call<{ want: number; watching: number; watched: number; reviews: number }>(
      `/title-stats/${mediaType}/${tmdbId}`,
    ),

  exportLibrary: (format: 'velora' | 'simkl' = 'velora') =>
    call<unknown>(`/library/export?format=${format}`),
  /** SIMKL CSV export returns { filename, contentType, csv }. */
  exportLibraryCsv: () =>
    call<{ filename: string; contentType: string; csv: string }>('/library/export?format=simkl'),
  importLibrary: (format: 'velora' | 'simkl', data: unknown) =>
    call<{ imported: number; unresolved?: unknown[] }>('/library/import', { method: 'POST', body: { format, data } }),

  importMust: (items: unknown[]) =>
    call<{ results: { mustId: string; outcome: 'created' | 'existing_kept' | 'failed'; episodesAdded: number; error?: string }[] }>(
      '/library/import/must', { method: 'POST', body: { items }, timeoutMs: 90000 }),

  putReview: (mediaType: MediaType, tmdbId: number, body: { body?: string; rating?: number | null; seasonNumber?: number }) =>
    call<Review>(`/reviews/${mediaType}/${tmdbId}`, { method: 'PUT', body }),
  getReviews: (mediaType: MediaType, tmdbId: number, season?: number) =>
    call<{ reviews: Review[] }>(`/reviews/${mediaType}/${tmdbId}${season !== undefined ? `?season=${season}` : ''}`),
  getCircleReviews: (mediaType: MediaType, tmdbId: number) =>
    call<{ reviews: Review[]; watched: WatchedSeason[] }>(`/reviews/${mediaType}/${tmdbId}/circle`),
  deleteReview: (mediaType: MediaType, tmdbId: number, season = 0) =>
    call<{ removed: boolean }>(`/reviews/${mediaType}/${tmdbId}?season=${season}`, { method: 'DELETE' }),

  follow: (username: string) => call<{ following: boolean }>(`/social/follow/${encodeURIComponent(username)}`, { method: 'POST' }),
  unfollow: (username: string) =>
    call<{ following: boolean }>(`/social/follow/${encodeURIComponent(username)}`, { method: 'DELETE' }),
  match: (username: string) => call<MatchResult>(`/social/match/${encodeURIComponent(username)}`),
  activity: () => call<{ feed: ActivityEvent[] }>('/social/activity'),
};
