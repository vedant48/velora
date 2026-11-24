export const LIBRARY_TAB_KEYS = ['want', 'watched', 'series', 'insights'] as const;
export type LibraryTab = typeof LIBRARY_TAB_KEYS[number];

// Finger right-to-left advances in this order, clarified by the owner24Nov. Do not wrap
// at either edge, or let a mostly vertical scroll switch sections.
export function tabAfterSwipe(current: LibraryTab, dx: number, dy: number, velocityX: number): LibraryTab {
  if (Math.abs(dy) > Math.abs(dx) || (Math.abs(dx) < 56 && !(Math.abs(dx) > 18 && Math.abs(velocityX) > 650))) return current;
  const index = LIBRARY_TAB_KEYS.indexOf(current);
  return LIBRARY_TAB_KEYS[Math.max(0, Math.min(LIBRARY_TAB_KEYS.length - 1, index + (dx < 0 ? 1 : -1)))];
}

/** Which tab a library item belongs to. A series the user only wants stays in Want, not in Series. */
export function itemInTab(item: { media_type: string; status: string }, tab: LibraryTab): boolean {
  if (tab === 'series') return item.media_type === 'tv' && item.status !== 'want';
  if (tab === 'insights') return false;
  return item.status === tab;
}
