import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { MediaItem } from '../../api/types';
import { getImageUrl, IMAGE_CONFIG } from '../../utils/image';
import { metrics } from '../../theme/metrics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
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
}

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 300,
  mass: 0.5,
};

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
}) => {
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
        style={[styles.card, { width, height }]}
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

        {/* Top-Right Rating Badge */}
        {item.vote_average > 0 && (
          <View style={styles.badgeContainer}>
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

      {/* Optional Title under card */}
      {showTitle && (
        <Text style={typography.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
      )}
    </Animated.View>
  );
};

// Custom equality to guarantee zero unnecessary re-renders in FlashList
export const MovieCard = React.memo(MovieCardComponent, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.poster_path === next.item.poster_path &&
    prev.width === next.width &&
    prev.height === next.height &&
    prev.rank === next.rank &&
    prev.progress === next.progress &&
    prev.duration === next.duration &&
    prev.showTitle === next.showTitle &&
    prev.hasMarginRight === next.hasMarginRight
  );
});

MovieCard.displayName = 'MovieCard';

const styles = StyleSheet.create({
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
