import { useNavigation } from '@react-navigation/native';
import { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LibraryItem, LibraryStatus, MediaType, veloraApi } from '../../api/velora';
import { useAuth } from '../../state/AuthContext';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { AppLoader } from '../common/AppLoader';
import { EpisodeTracker } from './EpisodeTracker';
import { RatingPicker } from './RatingPicker';
import { StatusPicker } from './StatusPicker';
import { ui } from '../../theme/ui';

interface TrackSectionProps {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate?: string;
  totalEpisodes?: number;
}

/** Must-style tracking card on the Details screen: list status + rating + episodes. */
export const TrackSection = memo(function TrackSection({
  mediaType,
  tmdbId,
  title,
  posterPath,
  backdropPath,
  releaseDate,
  totalEpisodes = 0,
}: TrackSectionProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { user, apiReady } = useAuth();
  const navigation = useNavigation<any>();
  const [item, setItem] = useState<LibraryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user || !apiReady) {
      setLoading(false);
      return;
    }
    veloraApi
      .lookup([{ mediaType, tmdbId }])
      .then(({ states }) => {
        if (!cancelled) setItem(states[`${mediaType}:${tmdbId}`] ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, apiReady, mediaType, tmdbId]);

  const save = useCallback(
    async (patch: Partial<Pick<LibraryItem, 'status' | 'rating' | 'episodes_watched' | 'total_episodes'>> & { status?: LibraryStatus | null }) => {
      if (!user || saving) return;
      setSaving(true);
      try {
        if (patch.status === null && !patch.rating) {
          await veloraApi.removeItem(mediaType, tmdbId);
          setItem(null);
          return;
        }
        if (!item) {
          const created = await veloraApi.upsertItem({
            mediaType,
            tmdbId,
            title,
            posterPath,
            backdropPath,
            releaseDate,
            status: (patch.status as LibraryStatus) ?? 'want',
            rating: patch.rating ?? null,
            episodesWatched: patch.episodes_watched ?? 0,
            totalEpisodes: patch.total_episodes ?? totalEpisodes,
          });
          setItem(created);
        } else {
          const updated = await veloraApi.patchItem(mediaType, tmdbId, {
            ...(patch.status ? { status: patch.status } : {}),
            ...(patch.rating !== undefined ? { rating: patch.rating } : {}),
            ...(patch.episodes_watched !== undefined ? { episodesWatched: patch.episodes_watched } : {}),
            ...(patch.total_episodes !== undefined ? { totalEpisodes: patch.total_episodes } : {}),
          });
          setItem(updated);
        }
      } catch {
        // keep UI state; offline retry can be layered later
      } finally {
        setSaving(false);
      }
    },
    [user, saving, item, mediaType, tmdbId, title, posterPath, backdropPath, releaseDate, totalEpisodes],
  );

  if (!apiReady) return null;

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Track this {mediaType === 'tv' ? 'series' : 'movie'}</Text>
        <Pressable style={styles.loginCta} onPress={() => navigation.navigate('Auth')}>
          <Text style={styles.loginCtaText}>Log in to rate & track</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Track this {mediaType === 'tv' ? 'series' : 'movie'}</Text>
        {saving && <AppLoader size="small" />}
      </View>
      {loading ? (
        <AppLoader style={{ marginVertical: ui.space.md }} />
      ) : (
        <>
          <StatusPicker status={item?.status ?? null} onChange={(status) => save({ status: status ?? undefined })} />
          <Text style={styles.subheading}>Your rating</Text>
          <RatingPicker rating={item?.rating ?? null} onChange={(rating) => save({ rating })} />
          {mediaType === 'tv' && item?.status === 'watching' && (
            <>
              <Text style={styles.subheading}>Episodes</Text>
              <EpisodeTracker
                watched={item.episodes_watched}
                total={item.total_episodes || totalEpisodes}
                onChange={(episodes_watched) =>
                  save({ episodes_watched, total_episodes: item.total_episodes || totalEpisodes })
                }
              />
            </>
          )}
        </>
      )}
    </View>
  );
});

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    marginTop: ui.space.xl,
    padding: ui.space.lg,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subheading: {
    marginTop: 6,
    fontSize: ui.type.label,
    fontWeight: '700',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  loginCta: {
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  loginCtaText: {
    fontSize: ui.type.body,
    fontWeight: '700',
    color: '#fff',
  },
});
