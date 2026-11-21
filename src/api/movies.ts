import { proxyGet } from './client';
import {
  Movie,
  MovieDetails,
  Credits,
  TMDBResponse,
  CollectionResponse,
  WatchProvidersResponse,
} from './types';

export async function getTrendingMovies(signal?: AbortSignal): Promise<Movie[]> {
  const data = await proxyGet<TMDBResponse<Movie>>(
    '/v1/tmdb/3/trending/movie/day',
    { signal }
  );
  return data.results || [];
}

export async function getPopularMovies(
  page: number = 1,
  signal?: AbortSignal
): Promise<Movie[]> {
  const data = await proxyGet<TMDBResponse<Movie>>(
    `/v1/tmdb/3/movie/popular?page=${page}`,
    { signal }
  );
  return data.results || [];
}

export async function getTopRatedMovies(
  page: number = 1,
  signal?: AbortSignal
): Promise<Movie[]> {
  const data = await proxyGet<TMDBResponse<Movie>>(
    `/v1/tmdb/3/movie/top_rated?page=${page}`,
    { signal }
  );
  return data.results || [];
}

export async function getNowPlayingMovies(
  page: number = 1,
  signal?: AbortSignal
): Promise<Movie[]> {
  const data = await proxyGet<TMDBResponse<Movie>>(
    `/v1/tmdb/3/movie/now_playing?page=${page}`,
    { signal }
  );
  return data.results || [];
}

export async function getUpcomingMovies(
  page: number = 1,
  signal?: AbortSignal
): Promise<Movie[]> {
  const data = await proxyGet<TMDBResponse<Movie>>(
    `/v1/tmdb/3/movie/upcoming?page=${page}`,
    { signal }
  );
  return data.results || [];
}

export async function getMoviesByGenre(
  genreId: number,
  page: number = 1,
  signal?: AbortSignal
): Promise<Movie[]> {
  const data = await proxyGet<TMDBResponse<Movie>>(
    `/v1/tmdb/3/discover/movie?with_genres=${genreId}&page=${page}&sort_by=popularity.desc`,
    { signal }
  );
  return data.results || [];
}

export async function getMovieDetails(
  id: number,
  signal?: AbortSignal
): Promise<MovieDetails> {
  return proxyGet<MovieDetails>(`/v1/tmdb/3/movie/${id}`, { signal });
}

export async function getMovieCredits(
  id: number,
  signal?: AbortSignal
): Promise<Credits> {
  return proxyGet<Credits>(`/v1/tmdb/3/movie/${id}/credits`, { signal });
}

export async function getSimilarMovies(
  id: number,
  signal?: AbortSignal
): Promise<Movie[]> {
  const data = await proxyGet<TMDBResponse<Movie>>(
    `/v1/tmdb/3/movie/${id}/similar`,
    { signal }
  );
  return data.results || [];
}

export async function getCollection(
  collectionId: number,
  signal?: AbortSignal
): Promise<CollectionResponse> {
  return proxyGet<CollectionResponse>(`/v1/tmdb/3/collection/${collectionId}`, {
    signal,
  });
}

export async function getMovieWatchProviders(
  id: number,
  signal?: AbortSignal
): Promise<WatchProvidersResponse> {
  return proxyGet<WatchProvidersResponse>(`/v1/tmdb/3/movie/${id}/watch/providers`, {
    signal,
  });
}


export interface VideoItem {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official?: boolean;
}

export async function getMovieVideos(id: number, signal?: AbortSignal): Promise<VideoItem[]> {
  const data = await proxyGet<{ results: VideoItem[] }>(`/v1/tmdb/3/movie/${id}/videos`, { signal });
  return data.results || [];
}

/** Movies available on subscription streaming in India (TMDB discover, flatrate). */
export async function getStreamingMovies(page: number = 1, signal?: AbortSignal): Promise<Movie[]> {
  const data = await proxyGet<TMDBResponse<Movie>>(
    `/v1/tmdb/3/discover/movie?watch_region=IN&with_watch_monetization_types=flatrate&sort_by=popularity.desc&page=${page}`,
    { signal },
  );
  return data.results || [];
}

export async function getMovieRecommendations(id: number, signal?: AbortSignal): Promise<Movie[]> {
  const data = await proxyGet<TMDBResponse<Movie>>(`/v1/tmdb/3/movie/${id}/recommendations`, { signal });
  return data.results || [];
}
