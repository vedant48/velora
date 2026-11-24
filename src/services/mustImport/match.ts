import { MatchResult, MustItem, TmdbCandidate } from './types';

export function normalizeTitle(t: string): string {
  return t
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Pick the TMDB title for a Must record. Rules, strongest first:
 *  1. Same poster file as Must (Must posters are TMDB posters) -> sure.
 *  2. Exactly one candidate with the same title and same year -> sure.
 *  3. Anything else (several equal matches, off-by-one year, title only) -> review,
 *     the user picks. Nothing ambiguous is imported automatically.
 */
export function chooseMatch(item: MustItem, candidates: TmdbCandidate[]): MatchResult {
  if (candidates.length === 0) return { confidence: 'none', best: null, candidates: [], reason: 'No TMDB results' };
  const top = candidates.slice(0, 5);
  const byPoster = item.posterPath ? candidates.filter((c) => c.posterPath === item.posterPath) : [];
  if (byPoster.length === 1) {
    return { confidence: 'sure', best: byPoster[0], candidates: top, reason: 'Same poster' };
  }
  const want = normalizeTitle(item.title);
  const sameTitle = candidates.filter(
    (c) => normalizeTitle(c.title) === want || (c.originalTitle && normalizeTitle(c.originalTitle) === want),
  );
  const exact = item.year === null ? [] : sameTitle.filter((c) => c.year === item.year);
  if (exact.length === 1) return { confidence: 'sure', best: exact[0], candidates: top, reason: 'Same title and year' };
  const ordered = [...exact, ...sameTitle.filter((c) => !exact.includes(c)), ...candidates.filter((c) => !sameTitle.includes(c))];
  const unique = ordered.filter((c, i) => ordered.indexOf(c) === i).slice(0, 5);
  const reason = exact.length > 1 ? 'Several titles share this name and year' : sameTitle.length ? 'Title matches but the year differs' : 'No exact title match';
  return { confidence: 'review', best: unique[0], candidates: unique, reason };
}
