/**
 * TMDB's fixed public genre tables (movie + TV). Used to label wide cards and
 * hero meta from an item's genre_ids without an extra network call.
 */
export const MOVIE_GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

export const TV_GENRES: Record<number, string> = {
  10759: 'Action & Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  10762: 'Kids',
  9648: 'Mystery',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
  37: 'Western',
};

export const genreNames = (
  ids: number[] | undefined,
  mediaType: 'movie' | 'tv',
  max = 2,
): string => {
  const map = mediaType === 'tv' ? TV_GENRES : MOVIE_GENRES;
  return (ids ?? [])
    .map((id) => map[id])
    .filter(Boolean)
    .slice(0, max)
    .join(' · ');
};
