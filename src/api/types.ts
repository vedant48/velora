export interface Movie {
  id: number;
  title: string;
  original_title?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  popularity?: number;
  adult?: boolean;
  media_type?: 'movie';
}

export interface TVSeries {
  id: number;
  name: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  popularity?: number;
  media_type?: 'tv';
}

export type MediaItem = {
  id: number;
  media_type?: 'movie' | 'tv';
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  genre_ids?: number[];
};

export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path?: string | null;
}

export interface Credits {
  id: number;
  cast: CastMember[];
  crew: CrewMember[];
}

export interface MovieDetails extends Movie {
  runtime: number;
  genres: Genre[];
  tagline: string;
  budget?: number;
  revenue?: number;
  status: string;
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;
}

export interface TVDetails extends TVSeries {
  number_of_seasons: number;
  number_of_episodes: number;
  genres: Genre[];
  tagline: string;
  status: string;
  seasons: {
    id: number;
    name: string;
    season_number: number;
    episode_count: number;
    poster_path: string | null;
  }[];
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  vote_average: number;
  air_date: string;
  runtime?: number;
}

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface CollectionResponse {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: Movie[];
}

export interface WatchProvider {
  logo_path: string | null;
  provider_id: number;
  provider_name: string;
  display_priority: number;
}

export interface WatchProviderRegion {
  link?: string;
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
}

export interface WatchProvidersResponse {
  id: number;
  results: Record<string, WatchProviderRegion>;
}

export interface PersonDetail {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
}

export interface PersonCreditItem {
  id: number;
  title?: string;
  name?: string;
  media_type: 'movie' | 'tv';
  character?: string;
  job?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  overview: string;
}

export interface PersonCombinedCredits {
  id: number;
  cast: PersonCreditItem[];
  crew: PersonCreditItem[];
}
