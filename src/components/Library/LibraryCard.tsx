import { Ionicons } from '@expo/vector-icons';
import { CachedImage as Image } from '../../experience/CachedImage';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LibraryItem } from '../../api/velora';
import { useTVDetailsQuery } from '../../api/queries';
import { isEndedComplete, seriesProgress } from './seriesProgress';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w342';

interface LibraryCardProps {
  item: LibraryItem;
  onPress: (item: LibraryItem) => void;
  onLongPress?: (item: LibraryItem) => void;
}

/** Poster card with personal rating badge and episode progress. Memoized for FlashList. */
export const LibraryCard = memo(function LibraryCard({ item, onPress, onLongPress }: LibraryCardProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const prog = seriesProgress(item);
  // Only a series with every saved episode watched needs TMDB's status to decide the ended tick.
  const { data: tmdb } = useTVDetailsQuery(item.tmdb_id, !!prog && prog.left === 0);
  const ended = isEndedComplete(prog, tmdb);
  const uri = item.poster_path ? `${TMDB_IMG}${item.poster_path}` : null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={() => onPress(item)} onLongPress={onLongPress ? () => onLongPress(item) : undefined} style={styles.card}>
      <View style={styles.posterWrap}>
        {uri ? (
          <Image source={{ uri }} style={styles.poster} contentFit="cover" transition={150} recyclingKey={uri} />
        ) : (
          <View style={[styles.poster, styles.posterFallback]}>
            <Ionicons name="film-outline" size={26} color={colors.textMuted} />
          </View>
        )}
        {prog && ended && (
          <View style={styles.progressBadge} accessible accessibilityLabel="Ended, all episodes watched">
            <Ionicons name="checkmark" size={14} color={colors.accentCyan} />
          </View>
        )}
        {prog && !ended && (
          <View style={styles.progressBadge} accessible accessibilityLabel={`${prog.watched} of ${prog.total} episodes watched, ${prog.left} left`}>
            <View style={styles.pie}><View style={[styles.pieFill, { height: `${Math.round(prog.fraction * 100)}%` }]} /></View>
            {prog.left > 0 ? <Text style={styles.progressText}>{prog.left}</Text> : null}
          </View>
        )}
        {item.rating !== null && (
          <View style={styles.ratingBadge} accessible accessibilityLabel={`Your rating ${item.rating}`}>
            <Ionicons name="star" size={11} color={colors.accentAmber} />
            <Text style={styles.ratingText}>{item.rating}</Text>
            {item.more_ratings ? <Text style={styles.ratingText} accessibilityLabel="more season ratings">..</Text> : null}
            {item.has_review ? <Ionicons name="reorder-three" size={13} color={colors.accentAmber} accessibilityLabel="has written review" /> : null}
          </View>
        )}
      </View>
      {item.media_type === 'tv' && item.status === 'watching' && item.total_episodes > 0 && (
        <Text style={styles.progress}>
          {item.total_episodes - item.episodes_watched > 0
            ? `${item.total_episodes - item.episodes_watched} ep left`
            : 'Complete'}
        </Text>
      )}
    </Pressable>
  );
});

const createStyles = (colors: AppColors) => StyleSheet.create({
  card: { flex: 1, margin: 0 },
  posterWrap: { borderRadius: 3, overflow: 'hidden' },
  poster: { width: '100%', aspectRatio: 2 / 3, borderRadius: 3, backgroundColor: colors.surface },
  posterFallback: { alignItems: 'center', justifyContent: 'center' },
  ratingBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accentAmber,
    backgroundColor: colors.glassDark,
  },
  progressBadge: {
    position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, backgroundColor: colors.glassDark,
    borderWidth: 1, borderColor: colors.accentCyan,
  },
  pie: { width: 13, height: 13, borderRadius: 7, borderWidth: 1.5, borderColor: colors.accentCyan, overflow: 'hidden', justifyContent: 'flex-end' },
  pieFill: { width: '100%', backgroundColor: colors.accentCyan },
  progressText: { fontSize: 12, fontWeight: '800', color: colors.accentCyan },
  ratingText: { fontSize: 12, fontWeight: '800', color: colors.accentAmber },
  title: { marginTop: 6, fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  progress: { marginTop: 2, fontSize: 10, fontWeight: '700', color: colors.accentCyan },
});
