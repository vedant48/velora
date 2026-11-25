import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { memo, useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { LibraryMeta, fetchOwnReview, useLibraryItem } from '../../hooks/useLibraryItem';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { AppLoader } from '../common/AppLoader';
import { ActionSheet, ActionSheetOption } from './ActionSheet';
import { RateReviewSheet } from './RateReviewSheet';
import { ui } from '../../theme/ui';
import { PillRowSkeleton } from '../Skeleton/ContentSkeletons';

interface TrackingControlsProps extends LibraryMeta {
  /**
   * Series only: the top status-bar menu bulk actions apply to the WHOLE
   * series (user-confirmed 21 Nov, quoting the Watching menu). The
   * season-list footer button is the selected-season-only one.
   */
  onMarkAllWatched?: () => Promise<unknown>;
  onMarkAllUnwatched?: () => Promise<unknown>;
  /** Called after any status/progress change so the page can refresh. */
  onChanged?: () => void;
  /** Shared hook instance owned by the screen (poster badge etc. use it too). */
  lib: ReturnType<typeof useLibraryItem>;
}

type SheetKind = 'none' | 'want' | 'watched' | 'watching' | 'rate';

/**
 * Must-style tracking controls: neutral = side-by-side pills (Want/Watched for
 * movies, Want/Watching for series); selected = full-width blue checked bar
 * with an ellipsis that opens the status action sheet.
 */
export const TrackingControls = memo(function TrackingControls(props: TrackingControlsProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { mediaType, tmdbId, title, posterPath, onMarkAllWatched, onMarkAllUnwatched, onChanged } = props;
  const navigation = useNavigation<any>();
  const lib = props.lib;
  const { status, saving, signedIn, apiReady } = lib;
  const [sheet, setSheet] = useState<SheetKind>('none');
  const [prefill, setPrefill] = useState<{ rating: number | null; body: string }>({ rating: null, body: '' });

  const year = useMemo(() => {
    const d = props.releaseDate;
    return d ? `(${d.slice(0, 4)})` : undefined;
  }, [props.releaseDate]);

  const openRateSheet = useCallback(
    async (withPrefill: boolean) => {
      if (withPrefill) {
        const existing = await fetchOwnReview(mediaType, tmdbId, 0);
        setPrefill({ rating: existing?.rating ?? null, body: existing?.body ?? '' });
      } else {
        setPrefill({ rating: null, body: '' });
      }
      setSheet('rate');
    },
    [mediaType, tmdbId],
  );

  if (!apiReady) return null;
  if (lib.loading) return <PillRowSkeleton />;

  if (!signedIn) {
    return (
      <Pressable style={styles.loginCta} onPress={() => navigation.navigate('Auth')}>
        <Text style={styles.loginCtaText}>Log in to track</Text>
      </Pressable>
    );
  }

  const isMovie = mediaType === 'movie';
  const secondStatus = isMovie ? 'Watched' : 'Watching';
  const secondKey = isMovie ? 'watched' : 'watching';

  const closeAnd = (fn: () => void) => () => fn();

  const wantOptions: ActionSheetOption[] = isMovie
    ? [
        { label: 'Move to Watched', onPress: closeAnd(() => void openRateSheet(false)) },
        { label: 'Remove from Want', onPress: closeAnd(() => void lib.removeItem().then(onChanged)) },
      ]
    : [
        { label: 'Remove from want', onPress: closeAnd(() => void lib.removeItem().then(onChanged)) },
        { label: "I'm watching this", onPress: closeAnd(() => void lib.setStatus('watching').then(onChanged)) },
        {
          label: 'Mark all as watched',
          onPress: closeAnd(() => void onMarkAllWatched?.().then(onChanged)),
        },
      ];

  const watchedOptions: ActionSheetOption[] = [
    { label: 'Move to Want', onPress: closeAnd(() => void lib.moveToWant().then(onChanged)) },
    { label: 'Remove from Watched', onPress: closeAnd(() => void lib.removeItem().then(onChanged)) },
    { label: 'Edit', onPress: closeAnd(() => void openRateSheet(true)) },
  ];

  const watchingOptions: ActionSheetOption[] = [
    { label: 'Remove from my Series', onPress: closeAnd(() => void lib.removeItem().then(onChanged)) },
    {
      label: 'Mark all as unwatched',
      onPress: closeAnd(() => void onMarkAllUnwatched?.().then(onChanged)),
    },
    {
      label: 'Mark all as watched',
      onPress: closeAnd(() => void onMarkAllWatched?.().then(onChanged)),
    },
    { label: 'Move to Want', onPress: closeAnd(() => void lib.moveToWant().then(onChanged)) },
  ];

  const activeLabel =
    status === 'want' ? 'Want' : status === 'watched' ? 'Watched' : status === 'watching' ? 'Watching' : null;

  return (
    <View style={styles.container}>
      {status === null ? (
        <View style={styles.pillsRow}>
          <Pressable
            onPress={() => void lib.setStatus('want').then(onChanged)}
            style={({ pressed }) => [styles.pill, styles.wantPill, pressed && styles.pillPressed]}
            accessibilityRole="button"
            accessibilityLabel="Want" disabled={saving}
          >
            {saving ? (
              <AppLoader size="small" />
            ) : (
              <>
                <Ionicons name="add" size={17} color="#FFF" />
                <Text style={styles.pillText}>Want</Text>
              </>
            )}
          </Pressable>
          <Pressable
            onPress={() => {
              if (isMovie) {
                void openRateSheet(false); // M1: direct Watched opens the same review/rating sheet
              } else {
                void lib.setStatus('watching').then(onChanged);
              }
            }}
            style={({ pressed }) => [styles.pill, styles.bluePill, pressed && styles.pillPressed]}
            accessibilityRole="button"
            accessibilityLabel={secondStatus} disabled={saving}
          >
            <Ionicons name={isMovie ? 'eye' : 'play'} size={15} color="#FFF" />
            <Text style={styles.pillText}>{secondStatus}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.pillsRow}>
          <Pressable
            onPress={() => setSheet(status === 'want' ? 'want' : status === 'watched' ? 'watched' : 'watching')}
            style={({ pressed }) => [
              styles.pill,
              status === 'want' ? styles.wantPill : styles.bluePill,
              pressed && styles.pillPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${activeLabel}, options`} disabled={saving}
          >
            {saving ? (
              <AppLoader onAccent />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#FFF" />
                <Text style={styles.pillText}>{activeLabel}</Text>
              </>
            )}
          </Pressable>
          <Pressable
            onPress={() => setSheet(status === 'want' ? 'want' : status === 'watched' ? 'watched' : 'watching')}
            style={({ pressed }) => [styles.moreButton, pressed && styles.pillPressed]}
            accessibilityRole="button"
            accessibilityLabel="More options" disabled={saving}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
      )}

      <ActionSheet showCancel={false} visible={sheet === 'want'} options={wantOptions} onClose={() => setSheet('none')} />
      <ActionSheet visible={sheet === 'watched'} options={watchedOptions} onClose={() => setSheet('none')} />
      <ActionSheet visible={sheet === 'watching'} options={watchingOptions} onClose={() => setSheet('none')} />

      <RateReviewSheet
        visible={sheet === 'rate'}
        title={title}
        subtitle={year}
        posterPath={posterPath}
        initialRating={prefill.rating}
        initialBody={prefill.body}
        saving={saving}
        onClose={() => setSheet('none')}
        onSave={async (rating, body) => {
          const target = status === null || status === 'want' ? 'watched' : status;
          const saved = target === 'watched'
            ? await lib.setStatusWithReview('watched', rating, body)
            : await lib.saveReview(rating, body);
          if (saved) { setSheet('none'); onChanged?.(); }
          else Alert.alert('Could not save', 'Your draft is still here. Please try again.');
        }}
      />
    </View>
  );
});

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: { marginTop: ui.space.xs },
  pillsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  // Apple redesign: mock action-row colors (red Want / blue Watched / gray ellipsis)
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  wantPill: {
    backgroundColor: colors.primary,
  },
  bluePill: {
    backgroundColor: colors.appleBlue,
  },
  moreButton: {
    width: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.appleFill,
  },
  pillPressed: { opacity: 0.8 },
  pillText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  loginCta: {
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: colors.appleBlue,
  },
  loginCtaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
