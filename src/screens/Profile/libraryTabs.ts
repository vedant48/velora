export const LIBRARY_TAB_KEYS = ['want', 'watched', 'series', 'insights'] as const;
export type LibraryTab = typeof LIBRARY_TAB_KEYS[number];

// Finger right-to-left advances in this order, clarified by the owner24Nov. Do not wrap
// at either edge, or let a mostly vertical scroll switch sections.
export function tabAfterSwipe(current: LibraryTab, dx: number, dy: number, velocityX: number): LibraryTab {
  if (Math.abs(dy) > Math.abs(dx) || (Math.abs(dx) < 56 && !(Math.abs(dx) > 18 && Math.abs(velocityX) > 650))) return current;
  const index = LIBRARY_TAB_KEYS.indexOf(current);
  return LIBRARY_TAB_KEYS[Math.max(0, Math.min(LIBRARY_TAB_KEYS.length - 1, index + (dx < 0 ? 1 : -1)))];
}

/**
 * Which tab a library item belongs to (owner rules, 25 Nov): Want holds every Want title, movies and series.
 * Watched holds only watched movies. Series holds only series that are watching or watched.
 */
export function itemInTab(item: { media_type: string; status: string }, tab: LibraryTab): boolean {
  if (tab === 'want') return item.status === 'want';
  if (tab === 'watched') return item.media_type === 'movie' && item.status === 'watched';
  if (tab === 'series') return item.media_type === 'tv' && (item.status === 'watching' || item.status === 'watched');
  return false;
}

/**
 * Series tab order (owner rule, 25 Nov: "ended and watched ko series ke list me sbse niche daal do"):
 * series that TMDB says ended AND that are fully watched sink to the bottom; everything else keeps
 * the chosen order above them. Stable within each group. Unknown/failed TMDB status keeps a series
 * in the upper group, so nothing sinks on a guess. Same rule as the card's completion tick.
 */
export function endedCompleteLast<T>(list: readonly T[], isEndedCompleteItem: (item: T) => boolean): T[] {
  const active: T[] = [];
  const done: T[] = [];
  for (const item of list) (isEndedCompleteItem(item) ? done : active).push(item);
  return active.concat(done);
}
