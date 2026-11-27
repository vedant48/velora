import { getMovieRecommendations } from './movies';
import { getTVRecommendations } from './tv';
import { normalizeMedia } from './queries';
import { MediaItem } from './types';
import { LibraryItem } from './velora';

export interface ForYouRail {
  key: string;
  title: string;
  items: MediaItem[];
}

export interface ForYouResult {
  /** One interleaved rail across all seeds. */
  mixed: MediaItem[];
  /** Per-seed rails labelled "Because you liked <title>". */
  rails: ForYouRail[];
}

const SEEDS_PER_TYPE = 2;
const RAIL_SIZE = 15;
const MIN_RAIL = 4;

/**
 * Highest-rated tracked titles of one media type, rotated by `rotation` so a
 * pull-to-refresh surfaces different seeds instead of the same rail every visit.
 * Exported for tests.
 */
export function pickSeeds(
  library: LibraryItem[],
  mediaType: 'movie' | 'tv',
  count: number,
  rotation: number,
): LibraryItem[] {
  const rated = library
    .filter((i) => i.media_type === mediaType && (i.rating ?? 0) >= 5)
    .sort((a, b) => (b.rating! - a.rating!) || b.updated_at.localeCompare(a.updated_at));
  if (rated.length <= count) return rated;
  const start = rotation % rated.length;
  return Array.from({ length: count }, (_, k) => rated[(start + k) % rated.length]);
}

/** Recommendations minus anything already tracked (watched / watching / want) and the seed itself. Exported for tests. */
export function filterFresh(
  items: MediaItem[],
  tracked: Record<string, string>,
  seed: LibraryItem,
): MediaItem[] {
  const seen = new Set<number>([seed.tmdb_id]);
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return !tracked[`${item.media_type ?? seed.media_type}:${item.id}`];
  });
}

/**
 * Multi-seed personal recommendations: TMDB recommendations for the member's
 * top-rated movies AND series, interleaved, with tracked titles removed.
 * All client-side through the existing TMDB proxy - no backend changes.
 */
export async function buildForYouRails(opts: {
  library: LibraryItem[];
  tracked: Record<string, string>;
  filter: 'all' | 'movies' | 'tv';
  rotation: number;
}): Promise<ForYouResult> {
  const { library, tracked, filter, rotation } = opts;
  const seeds: LibraryItem[] = [
    ...(filter !== 'tv' ? pickSeeds(library, 'movie', SEEDS_PER_TYPE, rotation) : []),
    ...(filter !== 'movies' ? pickSeeds(library, 'tv', SEEDS_PER_TYPE, rotation) : []),
  ];
  if (seeds.length === 0) return { mixed: [], rails: [] };

  const responses = await Promise.allSettled(
    seeds.map((seed) =>
      seed.media_type === 'movie'
        ? getMovieRecommendations(seed.tmdb_id)
        : getTVRecommendations(seed.tmdb_id),
    ),
  );

  const rails: ForYouRail[] = [];
  seeds.forEach((seed, i) => {
    const res = responses[i];
    if (res.status !== 'fulfilled') return;
    const items = filterFresh(normalizeMedia(res.value, seed.media_type), tracked, seed).slice(0, RAIL_SIZE);
    if (items.length >= MIN_RAIL) {
      rails.push({
        key: `${seed.media_type}:${seed.tmdb_id}`,
        title: `Because you liked ${seed.title}`,
        items,
      });
    }
  });

  // Round-robin one title from each rail so movies and series mix evenly.
  const mixed: MediaItem[] = [];
  const seen = new Set<string>();
  for (let depth = 0; depth < RAIL_SIZE; depth++) {
    for (const rail of rails) {
      const item = rail.items[depth];
      const key = `${item?.media_type}:${item?.id}`;
      if (item && !seen.has(key)) {
        seen.add(key);
        mixed.push(item);
      }
    }
  }
  return { mixed, rails };
}
