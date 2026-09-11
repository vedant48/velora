import { proxyGet } from './client';
import { Movie, TVSeries, TMDBResponse, MediaItem } from './types';

export async function searchMovies(
  query: string,
  page: number = 1,
  signal?: AbortSignal
): Promise<Movie[]> {
  if (!query.trim()) return [];
  const data = await proxyGet<TMDBResponse<Movie>>(
    `/v1/tmdb/3/search/movie?query=${encodeURIComponent(query)}&page=${page}`,
    { signal }
  );
  return data.results || [];
}

export async function searchTV(
  query: string,
  page: number = 1,
  signal?: AbortSignal
): Promise<TVSeries[]> {
  if (!query.trim()) return [];
  const data = await proxyGet<TMDBResponse<TVSeries>>(
    `/v1/tmdb/3/search/tv?query=${encodeURIComponent(query)}&page=${page}`,
    { signal }
  );
  return data.results || [];
}

export type SearchResultItem = (Movie & { media_type: 'movie' }) | (TVSeries & { media_type: 'tv' });

export async function searchMulti(
  query: string,
  page: number = 1,
  signal?: AbortSignal
): Promise<MediaItem[]> {
  if (!query.trim()) return [];
  const data = await proxyGet<TMDBResponse<any>>(
    `/v1/tmdb/3/search/multi?query=${encodeURIComponent(query)}&page=${page}`,
    { signal }
  );

  return (data.results || [])
    .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
    .map((item: any) => ({
      id: item.id,
      media_type: item.media_type,
      title: item.title || item.name || '',
      overview: item.overview || '',
      poster_path: item.poster_path || null,
      backdrop_path: item.backdrop_path || null,
      vote_average: item.vote_average || 0,
      release_date: item.release_date || item.first_air_date,
      genre_ids: item.genre_ids || [],
    }));
}
