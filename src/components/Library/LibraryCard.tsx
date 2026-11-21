import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LibraryItem } from '../../api/velora';
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
        {item.rating !== null && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={9} color={colors.accentAmber} />
            <Text style={styles.ratingText}>{item.rating}</Text>
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
  card: { flex: 1, margin: 2 },
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
    backgroundColor: colors.glassDark,
  },
  ratingText: { fontSize: 11, fontWeight: '800', color: colors.accentAmber },
  title: { marginTop: 6, fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  progress: { marginTop: 2, fontSize: 10, fontWeight: '700', color: colors.accentCyan },
});
