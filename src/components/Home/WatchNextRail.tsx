import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LibraryItem, veloraApi } from '../../api/velora';
import { useAuth } from '../../state/AuthContext';
import { metrics } from '../../theme/metrics';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { getImageUrl, IMAGE_CONFIG } from '../../utils/image';

interface WatchNextRailProps {
  onPressItem: (item: LibraryItem) => void;
  showEmpty?: boolean;
}

/**
 * Must-style "Watch next" carousel on the TV Explore tab: large cards for the
 * signed-in user's in-progress series with a numeric badge of episodes left.
 * Hidden when signed out or nothing is being watched.
 */
export const WatchNextRail = memo(function WatchNextRail({ onPressItem, showEmpty = false }: WatchNextRailProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { user, apiReady } = useAuth();
  const [items, setItems] = useState<LibraryItem[]>([]);

  useEffect(() => {
    if (!user || !apiReady) {
      setItems([]);
      return;
    }
    let cancelled = false;
    veloraApi
      .getLibrary('watching', 'tv')
      .then(({ items }) => {
        if (!cancelled) setItems(items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user, apiReady]);

  if (items.length === 0) return showEmpty ? <View style={styles.root}><Text style={styles.heading}>Watch next</Text><Text style={{ color: colors.textTertiary, paddingHorizontal: 20 }}>Your in-progress series will appear here.</Text></View> : null;

  const cardWidth = Math.min(metrics.screenWidth * 0.58, 340);
  const cardHeight = Math.round(cardWidth * 1.5);

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Watch next</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        decelerationRate="fast"
        snapToInterval={cardWidth + 12}
      >
        {items.map((item) => {
          const backdrop = getImageUrl(item.poster_path, 'poster');
          const left = Math.max((item.total_episodes || 0) - item.episodes_watched, 0);
          return (
            <Pressable
              key={item.id}
              onPress={() => onPressItem(item)}
              style={({ pressed }) => [{ width: cardWidth }, pressed && { opacity: 0.88 }]}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              <View style={[styles.card, { width: cardWidth, height: cardHeight }]}>
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
                <LinearGradient
                  colors={['transparent', 'rgba(9, 9, 11, 0.9)']}
                  style={StyleSheet.absoluteFill}
                />
                {left > 0 && item.total_episodes > 0 && (
                  <View accessibilityLabel={`${left} episodes remaining`} style={styles.badge}>
                    <Text style={styles.badgeText}>{left}</Text>
                  </View>
                )}
                <View style={styles.meta}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.sub}>
                    {item.total_episodes > 0
                      ? `${item.episodes_watched}/${item.total_episodes} episodes`
                      : `${item.episodes_watched} episodes watched`}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
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
  card: {
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLight,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    minWidth: 30,
    height: 30,
    borderRadius: 5,
    paddingHorizontal: 8,
    backgroundColor: colors.glassDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  meta: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  sub: {
    color: '#D4D4DA',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
