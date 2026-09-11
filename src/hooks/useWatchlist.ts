import { useState, useEffect, useCallback } from 'react';
import { storage } from '../storage/storage';
import { MediaItem } from '../api/types';

const WATCHLIST_KEY = '@velora_watchlist';

type WatchlistListener = () => void;
const listeners = new Set<WatchlistListener>();

let memoryWatchlist: MediaItem[] = [];
let isInitialized = false;

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<MediaItem[]>(memoryWatchlist);

  useEffect(() => {
    // Initial fetch from storage if not already done
    if (!isInitialized) {
      storage.getItem<MediaItem[]>(WATCHLIST_KEY, []).then((stored) => {
        memoryWatchlist = stored;
        isInitialized = true;
        setWatchlist(stored);
      });
    }

    const onUpdate = () => {
      setWatchlist([...memoryWatchlist]);
    };

    listeners.add(onUpdate);
    return () => {
      listeners.delete(onUpdate);
    };
  }, []);

  const isInWatchlist = useCallback(
    (id: number) => {
      return watchlist.some((item) => item.id === id);
    },
    [watchlist]
  );

  const toggleWatchlist = useCallback(async (item: MediaItem) => {
    const exists = memoryWatchlist.some((i) => i.id === item.id);
    if (exists) {
      memoryWatchlist = memoryWatchlist.filter((i) => i.id !== item.id);
    } else {
      memoryWatchlist = [item, ...memoryWatchlist];
    }
    await storage.setItem(WATCHLIST_KEY, memoryWatchlist);
    notifyListeners();
  }, []);

  const removeFromWatchlist = useCallback(async (id: number) => {
    memoryWatchlist = memoryWatchlist.filter((i) => i.id !== id);
    await storage.setItem(WATCHLIST_KEY, memoryWatchlist);
    notifyListeners();
  }, []);

  return {
    watchlist,
    isInWatchlist,
    toggleWatchlist,
    removeFromWatchlist,
  };
}
