import { useCallback, useEffect, useState } from 'react';
import { veloraApi, LibraryItem, LibraryStatus, MediaType, Review } from '../api/velora';
import { useAuth } from '../state/AuthContext';

export interface LibraryMeta {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate?: string;
  totalEpisodes?: number;
}

/**
 * Loads the signed-in user's library state for one title and exposes the
 * Must-style actions. Retention rules (user-confirmed 21 Nov):
 * - Movie "Remove from Want/Watched" deletes the library item AND its
 *   whole-title review, so re-adding starts a fresh flow (M2).
 * - Status moves (want <-> watched/watching) keep the rating/review.
 */
export function useLibraryItem(meta: LibraryMeta) {
  const { user, apiReady } = useAuth();
  const [item, setItem] = useState<LibraryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!user || !apiReady) {
      setItem(null);
      setLoading(false);
      return;
    }
    try {
      const { states } = await veloraApi.lookup([{ mediaType: meta.mediaType, tmdbId: meta.tmdbId }]);
      setItem(states[`${meta.mediaType}:${meta.tmdbId}`] ?? null);
    } catch {
      // keep current state
    } finally {
      setLoading(false);
    }
  }, [user, apiReady, meta.mediaType, meta.tmdbId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      if (!user || saving) return false;
      setSaving(true);
      try {
        await fn();
        return true;
      } catch {
        return false;
      } finally {
        setSaving(false);
      }
    },
    [user, saving],
  );

  const ensurePatch = useCallback(
    async (patch: { status: LibraryStatus; rating?: number | null }) => {
      if (!item) {
        const created = await veloraApi.upsertItem({
          mediaType: meta.mediaType,
          tmdbId: meta.tmdbId,
          title: meta.title,
          posterPath: meta.posterPath,
          backdropPath: meta.backdropPath,
          releaseDate: meta.releaseDate,
          status: patch.status,
          rating: patch.rating ?? null,
          totalEpisodes: meta.totalEpisodes ?? 0,
        });
        setItem(created);
      } else {
        const updated = await veloraApi.patchItem(meta.mediaType, meta.tmdbId, patch);
        setItem(updated);
      }
    },
    [item, meta],
  );

  /** Plain status select with no review prompt (Want, or series Watching). */
  const setStatus = useCallback(
    (status: LibraryStatus) => run(async () => ensurePatch({ status })),
    [run, ensurePatch],
  );

  /**
   * Status move that carries a review/rating (movie Watched flow).
   * Rating here goes on the whole-title review; the library item's own
   * rating field stays untouched.
   */
  const setStatusWithReview = useCallback(
    (status: LibraryStatus, rating: number | null, body: string) =>
      run(async () => {
        await ensurePatch({ status });
        if (rating !== null || body) {
          await veloraApi.putReview(meta.mediaType, meta.tmdbId, {
            rating,
            body: body || undefined,
          });
        }
      }),
    [run, ensurePatch, meta.mediaType, meta.tmdbId],
  );

  /** Update review/rating only (Edit on an already-tracked title). */
  const saveReview = useCallback(
    (rating: number | null, body: string, seasonNumber = 0) =>
      run(async () => {
        await veloraApi.putReview(meta.mediaType, meta.tmdbId, {
          rating,
          body: body || undefined,
          seasonNumber,
        });
      }),
    [run, meta.mediaType, meta.tmdbId],
  );

  /** Move to Want = fresh start: clears rating/reviews/episode progress server-side. */
  const moveToWant = useCallback(
    () =>
      run(async () => {
        const updated = await veloraApi.moveToWant(meta.mediaType, meta.tmdbId);
        setItem(updated);
      }),
    [run, meta.mediaType, meta.tmdbId],
  );

  /**
   * Remove the title. The server cascades dependent data (confirmed 21 Nov):
   * movies drop the whole-title review (fresh re-add flow); series drop
   * episode progress and all season reviews/ratings.
   */
  const removeItem = useCallback(
    () =>
      run(async () => {
        await veloraApi.removeItem(meta.mediaType, meta.tmdbId);
        setItem(null);
      }),
    [run, meta.mediaType, meta.tmdbId],
  );

  return {
    item,
    status: (item?.status ?? null) as LibraryStatus | null,
    loading,
    saving,
    signedIn: Boolean(user),
    apiReady,
    reload,
    setStatus,
    setStatusWithReview,
    saveReview,
    moveToWant,
    removeItem,
  };
}

/** Fetches the user's own whole-title review (for Edit prefill). */
export async function fetchOwnReview(
  mediaType: MediaType,
  tmdbId: number,
  seasonNumber = 0,
): Promise<Review | null> {
  try {
    const { reviews } = await veloraApi.getReviews(mediaType, tmdbId, seasonNumber);
    const mine = await veloraApi.me().then((r) => r.user.id).catch(() => null);
    return reviews.find((r) => r.user_id === mine) ?? null;
  } catch {
    return null;
  }
}
