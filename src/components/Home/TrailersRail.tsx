import { FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CachedImage as Image } from '../../experience/CachedImage';
import { memo, useCallback } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getMovieVideos } from '../../api/movies';
import { getTVVideos } from '../../api/tv';
import { MediaItem } from '../../api/types';
import { metrics } from '../../theme/metrics';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { getImageUrl, IMAGE_CONFIG } from '../../utils/image';

interface TrailersRailProps {
  title?: string;
  items: MediaItem[];
  /** Fallback when a title has no trailer. */
  onItemPress: (item: MediaItem) => void;
}

/**
 * Must-style Trailers rail: large backdrop cards with a play badge. Tapping
 * opens the title's official trailer on YouTube (from TMDB videos); titles
 * without a trailer fall back to the details page.
 */
export const TrailersRail = memo(function TrailersRail({ title = 'Trailers', items, onItemPress }: TrailersRailProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const openTrailer = useCallback(
    async (item: MediaItem) => {
      try {
        const videos = item.media_type === 'tv' ? await getTVVideos(item.id) : await getMovieVideos(item.id);
        const yt = videos.filter((v) => v.site === 'YouTube');
        const pick =
          yt.find((v) => v.type === 'Trailer' && v.official) ??
          yt.find((v) => v.type === 'Trailer') ??
          yt.find((v) => v.type === 'Teaser') ??
          yt[0];
        if (pick) {
          await Linking.openURL(`https://www.youtube.com/watch?v=${pick.key}`);
          return;
        }
      } catch {
        // fall through to details
      }
      onItemPress(item);
    },
    [onItemPress],
  );

  if (!items || items.length === 0) return null;

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>{title}</Text>
      <FlatList horizontal data={items.slice(0, 12)} keyExtractor={item => `${item.media_type}-${item.id}`} initialNumToRender={2} maxToRenderPerBatch={2} windowSize={3} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll} renderItem={({ item }) => {
          const backdrop = getImageUrl(item.backdrop_path || item.poster_path, 'backdrop');
          return (
            <Pressable
              key={`${item.media_type}-${item.id}`}
              onPress={() => void openTrailer(item)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel={`${item.title} trailer`}
            >
              <View style={styles.backdropWrap}>
                {backdrop ? (
                  <Image
                    source={{ uri: backdrop }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={IMAGE_CONFIG.transition}
                    cachePolicy={IMAGE_CONFIG.cachePolicy}
                    placeholder={IMAGE_CONFIG.placeholder}
                  />
                ) : null}
                <View style={styles.playBadge}>
                  <Ionicons name="play" size={18} color="#FFF" style={{ marginLeft: 2 }} />
                </View>
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {item.title}
              </Text>
            </Pressable>
          );
        }} />
    </View>
  );
});

const createStyles = (colors: AppColors) => StyleSheet.create({
  root: { marginTop: 18 },
  heading: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  scroll: { gap: 12, paddingHorizontal: 16 },
  card: { width: metrics.backdropWidth },
  backdropWrap: {
    width: metrics.backdropWidth,
    height: metrics.backdropHeight,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(10, 10, 14, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  name: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 7,
  },
});
