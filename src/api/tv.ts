import { proxyGet } from './client';
import {
  TVSeries,
  TVDetails,
  Credits,
  Episode,
  TMDBResponse,
  WatchProvidersResponse,
} from './types';

export async function getTrendingTV(signal?: AbortSignal): Promise<TVSeries[]> {
  const data = await proxyGet<TMDBResponse<TVSeries>>(
    '/v1/tmdb/3/trending/tv/day',
    { signal }
  );
  return data.results || [];
}

export async function getPopularTV(
  page: number = 1,
  signal?: AbortSignal
): Promise<TVSeries[]> {
  const data = await proxyGet<TMDBResponse<TVSeries>>(
    `/v1/tmdb/3/tv/popular?page=${page}`,
    { signal }
  );
  return data.results || [];
}

export async function getTopRatedTV(
  page: number = 1,
  signal?: AbortSignal
): Promise<TVSeries[]> {
  const data = await proxyGet<TMDBResponse<TVSeries>>(
    `/v1/tmdb/3/tv/top_rated?page=${page}`,
    { signal }
  );
  return data.results || [];
}

export async function getAiringTodayTV(
  page: number = 1,
  signal?: AbortSignal
): Promise<TVSeries[]> {
  const data = await proxyGet<TMDBResponse<TVSeries>>(
    `/v1/tmdb/3/tv/airing_today?page=${page}`,
    { signal }
  );
  return data.results || [];
}

export async function getTVByGenre(
  genreId: number,
  page: number = 1,
  signal?: AbortSignal
): Promise<TVSeries[]> {
  const data = await proxyGet<TMDBResponse<TVSeries>>(
    `/v1/tmdb/3/discover/tv?with_genres=${genreId}&page=${page}`,
    { signal }
  );
  return data.results || [];
}

export async function getTVDetails(
  seriesId: number,
  signal?: AbortSignal
): Promise<TVDetails> {
  return proxyGet<TVDetails>(`/v1/tmdb/3/tv/${seriesId}`, { signal });
}

export async function getTVCredits(
  seriesId: number,
  signal?: AbortSignal
): Promise<Credits> {
  return proxyGet<Credits>(`/v1/tmdb/3/tv/${seriesId}/credits`, { signal });
}

export async function getSeasonEpisodes(
  seriesId: number,
  seasonNumber: number,
  signal?: AbortSignal
): Promise<Episode[]> {
  const data = await proxyGet<{ episodes: Episode[] }>(
    `/v1/tmdb/3/tv/${seriesId}/season/${seasonNumber}`,
    { signal }
  );
  return data.episodes || [];
}

export async function getTVWatchProviders(
  seriesId: number,
  signal?: AbortSignal
): Promise<WatchProvidersResponse> {
  return proxyGet<WatchProvidersResponse>(`/v1/tmdb/3/tv/${seriesId}/watch/providers`, {
    signal,
  });
}

