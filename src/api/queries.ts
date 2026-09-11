import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getMoviesByGenre,
  getMovieDetails,
  getMovieCredits,
  getSimilarMovies,
  getCollection,
  getMovieWatchProviders,
} from './movies';
import {
  getTrendingTV,
  getPopularTV,
  getTopRatedTV,
  getTVDetails,
  getTVCredits,
  getSeasonEpisodes,
  getTVWatchProviders,
  getTVByGenre,
} from './tv';
import {
  getPersonDetails,
  getPersonCombinedCredits,
} from './person';
import { MediaItem, Episode } from './types';

const STALE_TIME = 10 * 60 * 1000; // 10 minutes cache freshness
const GC_TIME = 60 * 60 * 1000; // 1 hour garbage collection

// Helper to normalize Movie or TV array to MediaItem[]
function normalizeMedia(items: any[], type?: 'movie' | 'tv'): MediaItem[] {
  return items.map((item) => ({
    id: item.id,
    media_type: type || item.media_type || (item.title ? 'movie' : 'tv'),
    title: item.title || item.name || '',
    overview: item.overview || '',
    poster_path: item.poster_path || null,
    backdrop_path: item.backdrop_path || null,
    vote_average: item.vote_average || 0,
    release_date: item.release_date || item.first_air_date,
    genre_ids: item.genre_ids || [],
  }));
}

export function useTrendingMoviesQuery() {
  return useQuery({
    queryKey: ['trending', 'movies'],
    queryFn: async ({ signal }) => {
      const data = await getTrendingMovies(signal);
      return normalizeMedia(data, 'movie');
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function usePopularMoviesQuery() {
  return useQuery({
    queryKey: ['popular', 'movies'],
    queryFn: async ({ signal }) => {
      const data = await getPopularMovies(1, signal);
      return normalizeMedia(data, 'movie');
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useTopRatedMoviesQuery() {
  return useQuery({
    queryKey: ['top_rated', 'movies'],
    queryFn: async ({ signal }) => {
      const data = await getTopRatedMovies(1, signal);
      return normalizeMedia(data, 'movie');
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useNowPlayingMoviesQuery() {
  return useQuery({
    queryKey: ['now_playing', 'movies'],
    queryFn: async ({ signal }) => {
      const data = await getNowPlayingMovies(1, signal);
      return normalizeMedia(data, 'movie');
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function usePopularTVQuery() {
  return useQuery({
    queryKey: ['popular', 'tv'],
    queryFn: async ({ signal }) => {
      const data = await getPopularTV(1, signal);
      return normalizeMedia(data, 'tv');
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useTopRatedTVQuery() {
  return useQuery({
    queryKey: ['top_rated', 'tv'],
    queryFn: async ({ signal }) => {
      const data = await getTopRatedTV(1, signal);
      return normalizeMedia(data, 'tv');
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useTrendingTVQuery() {
  return useQuery({
    queryKey: ['trending', 'tv'],
    queryFn: async ({ signal }) => {
      const data = await getTrendingTV(signal);
      return normalizeMedia(data, 'tv');
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useGenreMoviesQuery(genreId: number) {
  return useQuery({
    queryKey: ['genre', genreId],
    queryFn: async ({ signal }) => {
      const data = await getMoviesByGenre(genreId, 1, signal);
      return normalizeMedia(data, 'movie');
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useCollectionQuery(collectionId: number) {
  return useQuery({
    queryKey: ['collection', collectionId],
    queryFn: async ({ signal }) => {
      const data = await getCollection(collectionId, signal);
      return normalizeMedia(data.parts || [], 'movie');
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useMovieDetailsQuery(id: number) {
  return useQuery({
    queryKey: ['movie_details', id],
    queryFn: ({ signal }) => getMovieDetails(id, signal),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: Boolean(id),
  });
}

export function useMovieCreditsQuery(id: number) {
  return useQuery({
    queryKey: ['movie_credits', id],
    queryFn: ({ signal }) => getMovieCredits(id, signal),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: Boolean(id),
  });
}

export function useSimilarMoviesQuery(id: number) {
  return useQuery({
    queryKey: ['similar_movies', id],
    queryFn: async ({ signal }) => {
      const data = await getSimilarMovies(id, signal);
      return normalizeMedia(data, 'movie');
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: Boolean(id),
  });
}

export function useTVDetailsQuery(id: number) {
  return useQuery({
    queryKey: ['tv_details', id],
    queryFn: ({ signal }) => getTVDetails(id, signal),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: Boolean(id),
  });
}

export function useTVCreditsQuery(id: number) {
  return useQuery({
    queryKey: ['tv_credits', id],
    queryFn: ({ signal }) => getTVCredits(id, signal),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: Boolean(id),
  });
}

export function useSeasonEpisodesQuery(seriesId: number, seasonNumber: number) {
  return useQuery({
    queryKey: ['tv_season_episodes', seriesId, seasonNumber],
    queryFn: ({ signal }) => getSeasonEpisodes(seriesId, seasonNumber, signal),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: Boolean(seriesId && seasonNumber !== undefined),
  });
}

export function useWatchProvidersQuery(id: number, isMovie: boolean) {
  return useQuery({
    queryKey: ['watch_providers', isMovie ? 'movie' : 'tv', id],
    queryFn: ({ signal }) =>
      isMovie ? getMovieWatchProviders(id, signal) : getTVWatchProviders(id, signal),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: Boolean(id),
  });
}

export function usePersonDetailsQuery(personId: number | null) {
  return useQuery({
    queryKey: ['person_details', personId],
    queryFn: ({ signal }) => getPersonDetails(personId!, signal),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: Boolean(personId),
  });
}

export function usePersonCreditsQuery(personId: number | null) {
  return useQuery({
    queryKey: ['person_credits', personId],
    queryFn: ({ signal }) => getPersonCombinedCredits(personId!, signal),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: Boolean(personId),
  });
}

export function useGenreInfiniteQuery(genreId: number, mediaType: 'movie' | 'tv' = 'movie') {
  return useInfiniteQuery({
    queryKey: ['genre_infinite', mediaType, genreId],
    queryFn: async ({ pageParam = 1, signal }) => {
      const items =
        mediaType === 'tv'
          ? await getTVByGenre(genreId, pageParam, signal)
          : await getMoviesByGenre(genreId, pageParam, signal);
      return normalizeMedia(items, mediaType);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage && lastPage.length >= 20 ? allPages.length + 1 : undefined;
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: Boolean(genreId),
  });
}


