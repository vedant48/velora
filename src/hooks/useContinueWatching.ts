import { useState, useEffect, useCallback } from 'react';
import { storage } from '../storage/storage';

export interface ContinueWatchingItem {
  movieId: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  progress: number; // in seconds or ratio
  duration: number; // in seconds
  media_type?: 'movie' | 'tv';
}

const CONTINUE_WATCHING_KEY = '@velora_continue_watching';

// No seeded demo rows: a fresh install has an empty Continue Watching and
// the Home section stays hidden until the user actually watches something.

type CWListener = () => void;
const cwListeners = new Set<CWListener>();
let memoryCW: ContinueWatchingItem[] = [];
let isCWInitialized = false;

function notifyCWListeners() {
  cwListeners.forEach((l) => l());
}

export function useContinueWatching() {
  const [items, setItems] = useState<ContinueWatchingItem[]>(memoryCW);

  useEffect(() => {
    if (!isCWInitialized) {
      storage
        .getItem<ContinueWatchingItem[]>(CONTINUE_WATCHING_KEY, [])
        .then((stored) => {
          memoryCW = stored;
          isCWInitialized = true;
          setItems(stored);
        });
    }

    const onUpdate = () => {
      setItems([...memoryCW]);
    };

    cwListeners.add(onUpdate);
    return () => {
      cwListeners.delete(onUpdate);
    };
  }, []);

  const updateProgress = useCallback(
    async (item: ContinueWatchingItem) => {
      const filtered = memoryCW.filter((i) => i.movieId !== item.movieId);
      memoryCW = [item, ...filtered];
      await storage.setItem(CONTINUE_WATCHING_KEY, memoryCW);
      notifyCWListeners();
    },
    []
  );

  const removeItem = useCallback(async (movieId: number) => {
    memoryCW = memoryCW.filter((i) => i.movieId !== movieId);
    await storage.setItem(CONTINUE_WATCHING_KEY, memoryCW);
    notifyCWListeners();
  }, []);

  return {
    continueWatchingItems: items,
    updateProgress,
    removeItem,
  };
}
