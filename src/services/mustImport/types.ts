export type MustStatus = 'want' | 'watching' | 'watched';

export interface MustSeason {
  number: number;
  rating: number | null;
  review: string | null;
  /** 1-based episode numbers (position in the season) that Must marks watched. */
  watchedEpisodes: number[];
  episodeCount: number;
  /** Must's air date per episode position (null when unknown), used to verify episode order against TMDB. */
  episodeDates: (string | null)[];
}

export interface MustItem {
  mustId: string;
  type: 'movie' | 'tv';
  title: string;
  year: number | null;
  releaseDate: string | null;
  posterPath: string | null;
  status: MustStatus;
  rating: number | null;
  review: { body: string; reviewedAt: string | null } | null;
  modifiedAt: string | null;
  /** null = the file has no season/episode detail for this show. */
  seasons: MustSeason[] | null;
}

export interface ParseResult {
  items: MustItem[];
  warnings: string[];
}

export interface TmdbCandidate {
  id: number;
  title: string;
  originalTitle: string;
  year: number | null;
  releaseDate: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  popularity: number;
}

export type MatchConfidence = 'sure' | 'review' | 'none';

export interface MatchResult {
  confidence: MatchConfidence;
  best: TmdbCandidate | null;
  candidates: TmdbCandidate[];
  reason: string;
}
