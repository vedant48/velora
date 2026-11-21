import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { memo, useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { LibraryMeta, fetchOwnReview, useLibraryItem } from '../../hooks/useLibraryItem';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { AppLoader } from '../common/AppLoader';
import { ActionSheet, ActionSheetOption } from './ActionSheet';
import { RateReviewSheet } from './RateReviewSheet';

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
  if (lib.loading) return <AppLoader style={{ paddingVertical: 16 }} />;

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
            style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
            accessibilityRole="button"
            accessibilityLabel="Want" disabled={saving}
          >
            {saving ? (
              <AppLoader size="small" />
            ) : (
              <Text style={styles.pillText}>Want</Text>
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
            style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
            accessibilityRole="button"
            accessibilityLabel={secondStatus} disabled={saving}
          >
            <Text style={styles.pillText}>{secondStatus}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setSheet(status === 'want' ? 'want' : status === 'watched' ? 'watched' : 'watching')}
          style={({ pressed }) => [styles.statusBar, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={`${activeLabel}, options`} disabled={saving}
        >
          <View style={styles.statusBarCenter}>
            <>{saving ? <AppLoader onAccent /> : <><Ionicons name="checkmark" size={20} color="#FFF" /><Text style={styles.statusBarText}>{activeLabel}</Text></>}</>
          </View>
          <Ionicons name="ellipsis-horizontal" size={20} color="#FFF" style={styles.statusBarEllipsis} />
        </Pressable>
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
  container: { marginTop: 4 },
  pillsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 26,
    backgroundColor: colors.surfaceLight,
  },
  pillPressed: { opacity: 0.8 },
  pillText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.trackBlue,
    borderRadius: 26,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  statusBarCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBarText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  statusBarEllipsis: {
    position: 'absolute',
    right: 20,
  },
  loginCta: {
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 26,
    backgroundColor: colors.trackBlue,
  },
  loginCtaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
