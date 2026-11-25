import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Episode } from '../../api/types';
import { Review, veloraApi } from '../../api/velora';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { AppLoader } from '../common/AppLoader';
import { RateReviewSheet } from './RateReviewSheet';
import { SeasonReviewCards } from './SeasonReviewCards';
import { ui } from '../../theme/ui';

const HINT_KEY = '@velora_episode_swipe_hint_seen';

interface EpisodeChecklistProps {
  seriesId: number;
  title: string;
  posterPath: string | null;
  seasonNumber: number;
  seasonYear?: string;
  episodes: Episode[];
  loadingEpisodes: boolean;
  signedIn: boolean;
  /** Called after progress mutations so the page can refresh counts. */
  onChanged?: () => void;
  /** Increment to force a progress reload (series-wide menu actions). */
  refreshKey?: number;
}

/**
 * Must-style season episode list: number + blue dot (unwatched) or check
 * (watched), title, air date. Swipe right on an unwatched row marks it
 * watched, with a one-time hint. Footer: season-level bulk actions and the
 * season review cards.
 */
export const EpisodeChecklist = memo(function EpisodeChecklist({
  seriesId,
  title,
  posterPath,
  seasonNumber,
  seasonYear,
  episodes,
  loadingEpisodes,
  signedIn,
  onChanged,
  refreshKey = 0,
}: EpisodeChecklistProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const [watchedSet, setWatchedSet] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [rateVisible, setRateVisible] = useState(false);
  const [seasonReview, setSeasonReview] = useState<Review | null>(null);
  const swipeRefs = useRef<Map<number, Swipeable>>(new Map());

  // Load per-episode progress for the whole series (all seasons, cheap single call)
  useEffect(() => {
    if (!signedIn) {
      setWatchedSet(new Set());
      return;
    }
    let cancelled = false;
    veloraApi
      .getEpisodeProgress(seriesId)
      .then(({ watched }) => {
        if (cancelled) return;
        setWatchedSet(new Set(watched.map((w) => `${w.season}:${w.episode}`)));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [signedIn, seriesId, refreshKey]);

  // One-time swipe hint
  useEffect(() => {
    if (!signedIn) return;
    AsyncStorage.getItem(HINT_KEY).then((v) => {
      if (!v) setShowHint(true);
    });
  }, [signedIn]);

  const dismissHint = useCallback(() => {
    setShowHint(false);
    void AsyncStorage.setItem(HINT_KEY, '1');
  }, []);

  // Own review/rating for this season (drives the pill badge + footer state)
  const loadSeasonReview = useCallback(() => {
    if (!signedIn) {
      setSeasonReview(null);
      return;
    }
    veloraApi
      .me()
      .then((me) =>
        veloraApi.getReviews('tv', seriesId, seasonNumber).then(({ reviews }) => {
          setSeasonReview(reviews.find((r) => r.user_id === me.user.id) ?? null);
        }),
      )
      .catch(() => setSeasonReview(null));
  }, [signedIn, seriesId, seasonNumber]);

  useEffect(() => {
    loadSeasonReview();
  }, [loadSeasonReview]);

  const watchedCount = useMemo(
    () => episodes.filter((e) => watchedSet.has(`${e.season_number}:${e.episode_number}`)).length,
    [episodes, watchedSet],
  );
  const allWatched = episodes.length > 0 && watchedCount === episodes.length;

  const markEpisode = useCallback(
    async (ep: Episode) => {
      if (!signedIn || busy) return;
      setBusy(true);
      dismissHint();
      try {
        await veloraApi.setEpisodeWatched(seriesId, {
          season: ep.season_number,
          episode: ep.episode_number,
          watched: true,
          title,
          posterPath,
        });
        setWatchedSet((prev) => new Set(prev).add(`${ep.season_number}:${ep.episode_number}`));
        // Watch state changed on the server: no consumer may serve the old progress.
        queryClient.invalidateQueries({ queryKey: ['epProgress', seriesId] });
        onChanged?.();
      } catch {
        // keep state
      } finally {
        setBusy(false);
      }
      swipeRefs.current.get(ep.episode_number)?.close();
    },
    [signedIn, busy, seriesId, title, posterPath, dismissHint, onChanged, queryClient],
  );

  const setWholeSeason = useCallback(
    async (watched: boolean) => {
      if (!signedIn || busy) return;
      setBusy(true);
      try {
        await veloraApi.setSeasonWatched(seriesId, seasonNumber, {
          watched,
          episodes: episodes.map((e) => e.episode_number),
          title,
          posterPath,
        });
        if (!watched) {
          // User-confirmed: unwatching clears that season's rating/review.
          await veloraApi.deleteReview('tv', seriesId, seasonNumber).catch(() => undefined);
          setSeasonReview(null);
        }
        queryClient.invalidateQueries({ queryKey: ['epProgress', seriesId] });
        setWatchedSet((prev) => {
          const next = new Set(prev);
          for (const e of episodes) {
            const k = `${e.season_number}:${e.episode_number}`;
            if (watched) next.add(k);
            else next.delete(k);
          }
          return next;
        });
        onChanged?.();
      } catch {
        // keep state
      } finally {
        setBusy(false);
      }
    },
    [signedIn, busy, seriesId, seasonNumber, episodes, title, posterPath, onChanged, queryClient],
  );

  const renderLeftActions = useCallback(
    (ep: Episode) => (
      <View style={styles.swipeAction}>
        <Ionicons name="checkmark" size={22} color="#FFF" />
      </View>
    ),
    [styles],
  );

  if (!signedIn) return null;

  return (
    <View style={styles.container}>
      {loadingEpisodes ? (
        <View style={styles.loadingRow}>
          <AppLoader size="small" />
          <Text style={styles.loadingText}>Loading episodes...</Text>
        </View>
      ) : episodes.length === 0 ? (
        <Text style={styles.emptyText}>No episodes available for this season.</Text>
      ) : (
        <View>
          {/* Apple redesign: season progress card (real per-episode progress) */}
          <View style={styles.progCard}>
            <View style={styles.progHead}>
              <Text style={styles.progTitle}>Season {seasonNumber}</Text>
              <Text style={styles.progSub}>{watchedCount} of {episodes.length} episodes</Text>
            </View>
            <View style={styles.progTrack}>
              <View style={[styles.progFill, { width: `${episodes.length ? Math.round((watchedCount / episodes.length) * 100) : 0}%` }]} />
            </View>
          </View>
          <View style={styles.listCard}>
          {episodes.map((ep, index) => {
            const key = `${ep.season_number}:${ep.episode_number}`;
            const isWatched = watchedSet.has(key);
            const row = (
              <View style={styles.row}>
                {isWatched ? (
                  <Ionicons name="checkmark-circle" size={24} color={colors.appleBlue} style={styles.epMark} />
                ) : (
                  <Ionicons name="ellipse-outline" size={24} color={colors.appleText3} style={styles.epMark} />
                )}
                <Text style={styles.epNumber}>{ep.episode_number}</Text>
                <View style={styles.epTextWrap}>
                  <Text style={styles.epTitle} numberOfLines={1}>
                    {ep.name}
                  </Text>
                  {!!ep.air_date && <Text style={styles.epDate}>{formatAirDate(ep.air_date)}</Text>}
                </View>
              </View>
            );

            const hint = index === 0 && showHint && !isWatched;

            return (
              <View key={ep.id || ep.episode_number}>
                {hint && (
                  <Pressable style={styles.hint} onPress={dismissHint}>
                    <Ionicons name="swap-horizontal" size={14} color={colors.appleBlue} />
                    <Text style={styles.hintText}>Swipe right to mark watched</Text>
                  </Pressable>
                )}
                {isWatched ? (
                  row
                ) : (
                  <Swipeable
                    ref={(r) => {
                      if (r) swipeRefs.current.set(ep.episode_number, r);
                    }}
                    renderLeftActions={() => renderLeftActions(ep)}
                    onSwipeableOpen={() => void markEpisode(ep)}
                    overshootLeft={false}
                    friction={1.6}
                  >
                    {row}
                  </Swipeable>
                )}
                {index < episodes.length - 1 && <View style={styles.divider} />}
              </View>
            );
          })}
          </View>

          {/* Season-level footer */}
          <View style={styles.footer}>
            {busy && <AppLoader size="small" />}
            {!allWatched ? (
              <Pressable
                onPress={() => void setWholeSeason(true)}
                style={({ pressed }) => [styles.footerButton, pressed && { opacity: 0.8 }]}
                accessibilityRole="button"
              >
                <Text style={styles.footerButtonText}>Mark all as watched</Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  onPress={() => setRateVisible(true)}
                  style={({ pressed }) => [styles.footerButton, pressed && { opacity: 0.8 }]}
                  accessibilityRole="button"
                >
                  <Text style={styles.footerButtonText}>
                    {seasonReview?.rating != null ? `Rate season  ★ ${seasonReview.rating}` : 'Rate season'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void setWholeSeason(false)}
                  style={({ pressed }) => [styles.footerButton, pressed && { opacity: 0.8 }]}
                  accessibilityRole="button"
                >
                  <Text style={styles.footerButtonText}>Mark all as unwatched</Text>
                </Pressable>
              </>
            )}
          </View>

          {/* Season review cards; seasonReview in deps so a fresh save shows immediately */}
          <SeasonReviewCards seriesId={seriesId} seasonNumber={seasonNumber} refreshSignal={seasonReview?.updated_at ?? seasonReview?.id ?? null} />

          <RateReviewSheet
            visible={rateVisible}
            title={title}
            subtitle={`Season ${seasonNumber}${seasonYear ? ` (${seasonYear})` : ''}`}
            posterPath={posterPath}
            initialRating={seasonReview?.rating ?? null}
            initialBody={seasonReview?.body ?? ''}
            onClose={() => setRateVisible(false)}
            onSave={(rating, body) => {
              setRateVisible(false);
              void veloraApi
                .putReview('tv', seriesId, { rating, body: body || undefined, seasonNumber })
                .then(() => {
                  loadSeasonReview();
                  onChanged?.();
                })
                .catch(() => undefined);
            }}
          />
        </View>
      )}
    </View>
  );
});

function formatAirDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: { marginTop: 2 },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ui.space.sm,
    paddingVertical: 20,
  },
  loadingText: { color: colors.textSecondary, fontSize: 13 },
  emptyText: { color: colors.textTertiary, fontSize: 13, paddingVertical: ui.space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  epNumber: {
    width: 22,
    color: colors.appleText2,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  epMark: { marginRight: 2 },
  epDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.trackBlue,
    marginHorizontal: ui.space.xs,
  },
  epTextWrap: { flex: 1, marginLeft: 10 },
  epTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  epDate: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.appleSeparator,
    marginLeft: 58,
  },
  progCard: {
    backgroundColor: colors.appleCard,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  progHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  progTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  progSub: { color: colors.appleText2, fontSize: 12 },
  progTrack: { height: 6, borderRadius: 3, backgroundColor: colors.appleFill, marginTop: 10, overflow: 'hidden' },
  progFill: { height: 6, borderRadius: 3, backgroundColor: colors.appleBlue },
  listCard: {
    backgroundColor: colors.appleCard,
    borderRadius: 14,
    overflow: 'hidden',
  },
  swipeAction: {
    backgroundColor: colors.appleBlue,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(10, 132, 255, 0.14)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  hintText: {
    color: colors.trackBlue,
    fontSize: ui.type.label,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: ui.space.lg,
  },
  footerButton: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  footerButtonText: {
    color: colors.textPrimary,
    fontSize: ui.type.body,
    fontWeight: '700',
  },
});
