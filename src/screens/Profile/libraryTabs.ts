export const LIBRARY_TAB_KEYS = ['want', 'watched', 'series', 'insights'] as const;
export type LibraryTab = typeof LIBRARY_TAB_KEYS[number];

// The owner explicitly requested rightward swipes in this order. Do not wrap
// at either edge, or let a mostly vertical scroll switch sections.
export function tabAfterSwipe(current: LibraryTab, dx: number, dy: number, velocityX: number): LibraryTab {
  if (Math.abs(dy) > Math.abs(dx) || (Math.abs(dx) < 56 && !(Math.abs(dx) > 18 && Math.abs(velocityX) > 650))) return current;
  const index = LIBRARY_TAB_KEYS.indexOf(current);
  return LIBRARY_TAB_KEYS[Math.max(0, Math.min(LIBRARY_TAB_KEYS.length - 1, index + (dx > 0 ? 1 : -1)))];
}
