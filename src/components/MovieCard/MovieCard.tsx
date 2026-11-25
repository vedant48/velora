import { CachedImage as Image } from '../../experience/CachedImage';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { MediaItem } from '../../api/types';
import { metrics } from '../../theme/metrics';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { getImageUrl, IMAGE_CONFIG } from '../../utils/image';
import { motion } from '../../experience/motion';
import { Badge } from '../common/Badge';
import { ProgressBar } from '../ProgressBar/ProgressBar';

interface MovieCardProps {
  item: MediaItem;
  onPress: (item: MediaItem) => void;
  width?: number;
  height?: number;
  rank?: number;
  progress?: number;
  duration?: number;
  showTitle?: boolean;
  hasMarginRight?: boolean;
  minimal?: boolean;
  trackingStatus?: string;
}

const SPRING_CONFIG = motion.press;

const MovieCardComponent: React.FC<MovieCardProps> = ({
  item,
  onPress,
  width = metrics.posterWidth,
  height = metrics.posterHeight,
  rank,
  progress,
  duration,
  showTitle = false,
  hasMarginRight = true,
  minimal = false,
  trackingStatus,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    'worklet';
    scale.value = withSpring(0.95, SPRING_CONFIG);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    'worklet';
    scale.value = withSpring(1, SPRING_CONFIG);
  }, [scale]);

  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const imageUrl = getImageUrl(item.poster_path || item.backdrop_path, 'poster');

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { width, marginRight: hasMarginRight ? metrics.carouselItemGap : 0 },
        animatedStyle,
      ]}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={[styles.card, { width, height }, minimal && { borderRadius: 12, borderWidth: 0 }]}
        accessibilityRole="button"
        accessibilityLabel={item.title}
      >
        {/* Hardware-accelerated cached image */}
        <Image
          source={imageUrl ? { uri: imageUrl } : undefined}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={IMAGE_CONFIG.transition}
          cachePolicy={IMAGE_CONFIG.cachePolicy}
          placeholder={IMAGE_CONFIG.placeholder}
        />

        {minimal && trackingStatus && <View style={{ position: 'absolute', right: 5, top: 5, borderRadius: 5, paddingVertical: 2, paddingHorizontal: 5, backgroundColor: colors.glassDark }}><Text style={{ fontSize: 11, color: colors.textPrimary, fontWeight: '700' }}>{trackingStatus === 'want' ? 'Want' : trackingStatus === 'watched' ? 'Watched' : 'Watching'}</Text></View>}
        {/* Top-Right Rating Badge (below the tracking pill when both are shown) */}
        {item.vote_average > 0 && (
          <View style={[styles.badgeContainer, minimal && trackingStatus ? { top: 28 } : null]}>
            <Badge rating={item.vote_average} variant="rating" />
          </View>
        )}

        {/* Optional Rank Badge for Trending */}
        {rank !== undefined && (
          <View style={styles.rankContainer}>
            <Text style={styles.rankText}>{rank}</Text>
          </View>
        )}

        {/* Optional Continue Watching Progress Bar */}
        {progress !== undefined && duration !== undefined && duration > 0 && (
          <View style={styles.progressContainer}>
            <ProgressBar progress={progress} duration={duration} height={4} />
          </View>
        )}
      </Pressable>

      {/* Optional Title + year under card */}
      {showTitle && (
        <View>
          <Text style={[typography.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.title}
          </Text>
          {!!(item.release_date ?? '').slice(0, 4) && (
            <Text style={[typography.cardSubtitle, { color: colors.textTertiary }]}>{(item.release_date ?? '').slice(0, 4)}</Text>
          )}
        </View>
      )}
    </Animated.View>
  );
};

// Use React's prop comparison. Theme hooks belong only in the component,
// never in a memo comparator invoked during list recycling.
export const MovieCard = React.memo(MovieCardComponent);

MovieCard.displayName = 'MovieCard';

const createStyles = (colors: AppColors) => StyleSheet.create({
  wrapper: {
    marginRight: metrics.carouselItemGap,
  },
  card: {
    borderRadius: metrics.posterBorderRadius,
    backgroundColor: colors.cardBackground,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeContainer: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  rankContainer: {
    position: 'absolute',
    bottom: -8,
    left: 4,
    zIndex: 10,
  },
  rankText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
    letterSpacing: -2,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
