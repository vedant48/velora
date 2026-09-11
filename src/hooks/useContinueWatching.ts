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

// Initial curated mock items if empty
const INITIAL_MOCK_ITEMS: ContinueWatchingItem[] = [
  {
    movieId: 969681, // Spider-Man
    title: 'Spider-Man: Brand New Day',
    poster_path: '/qeQJx07rK2xm8SD2sJxFKhE7gs0.jpg',
    backdrop_path: '/qeQJx07rK2xm8SD2sJxFKhE7gs0.jpg',
    progress: 5400,
    duration: 7800,
    media_type: 'movie',
  },
  {
    movieId: 533535, // Deadpool & Wolverine
    title: 'Deadpool & Wolverine',
    poster_path: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    backdrop_path: '/yDHYTfA3R0jFYba16jBB1jv8vpH.jpg',
    progress: 3200,
    duration: 7600,
    media_type: 'movie',
  },
  {
    movieId: 94605, // Arcane
    title: 'Arcane',
    poster_path: '/fqldf2t8ztc9aiwn397rDit3ua5.jpg',
    backdrop_path: '/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg',
    progress: 1800,
    duration: 2400,
    media_type: 'tv',
  },
];

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
        .getItem<ContinueWatchingItem[]>(CONTINUE_WATCHING_KEY, INITIAL_MOCK_ITEMS)
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
