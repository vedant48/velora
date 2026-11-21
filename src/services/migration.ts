import { storage } from '../storage/storage';
import { veloraApi } from '../api/velora';
import type { MediaItem } from '../api/types';
import { localWatchlistToImport } from './migrationMap';

const WATCHLIST_KEY = '@velora_watchlist';
const MIGRATED_KEY = '@velora_watchlist_migrated_v1';

export interface MigrationResult {
  attempted: number;
  imported: number;
}

/**
 * One-time import of the pre-account local watchlist (v1.1.0 AsyncStorage)
 * into the signed-in user's server library. Runs after every successful
 * login/signup and on app start with an existing session; the migrated flag
 * makes it a no-op afterwards. A failed import leaves the flag unset so the
 * next session retries - local data is only dropped by the user uninstalling,
 * never by this migration.
 */
export async function migrateLocalWatchlist(): Promise<MigrationResult | null> {
  const already = await storage.getItem<boolean>(MIGRATED_KEY, false);
  if (already) return null;
  const local = await storage.getItem<MediaItem[]>(WATCHLIST_KEY, []);
  const items = localWatchlistToImport(local);
  if (items.length === 0) {
    await storage.setItem(MIGRATED_KEY, true);
    return null;
  }
  const res = await veloraApi.importLibrary('velora', { items });
  await storage.setItem(MIGRATED_KEY, true);
  return { attempted: items.length, imported: res.imported };
}
