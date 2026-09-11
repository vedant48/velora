import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MediaItem } from '../../api/types';
import { getImageUrl, IMAGE_CONFIG } from '../../utils/image';
import { metrics } from '../../theme/metrics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Badge } from '../common/Badge';

interface HeroSlideProps {
  item: MediaItem;
  index: number;
  scrollX: SharedValue<number>;
  onPress: (item: MediaItem) => void;
  onWatchlistPress: (item: MediaItem) => void;
  isInWatchlist: boolean;
}

export const HeroSlide: React.FC<HeroSlideProps> = React.memo(
  ({
    item,
    index,
    scrollX,
    onPress,
    onWatchlistPress,
    isInWatchlist,
  }) => {
    const width = metrics.screenWidth;

    // UI-thread Parallax & Scale interpolation
    const animatedImageStyle = useAnimatedStyle(() => {
      const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

      const translateX = interpolate(
        scrollX.value,
        inputRange,
        [-width * 0.28, 0, width * 0.28],
        Extrapolation.CLAMP
      );

      const scale = interpolate(
        scrollX.value,
        inputRange,
        [1.08, 1, 1.08],
        Extrapolation.CLAMP
      );

      return {
        transform: [{ translateX }, { scale }],
      };
    });

    const animatedContentStyle = useAnimatedStyle(() => {
      const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

      const opacity = interpolate(
        scrollX.value,
        inputRange,
        [0.2, 1, 0.2],
        Extrapolation.CLAMP
      );

      const translateY = interpolate(
        scrollX.value,
        inputRange,
        [12, 0, 12],
        Extrapolation.CLAMP
      );

      return {
        opacity,
        transform: [{ translateY }],
      };
    });

    const imageUrl = getImageUrl(item.backdrop_path || item.poster_path, 'hero');

    const handlePress = useCallback(() => {
      onPress(item);
    }, [item, onPress]);

    const handleWatchlist = useCallback(() => {
      onWatchlistPress(item);
    }, [item, onWatchlistPress]);

    return (
      <View style={[styles.container, { width }]}>
        {/* Parallax Background Artwork */}
        <Animated.View style={[styles.imageWrapper, animatedImageStyle]}>
          <Image
            source={imageUrl ? { uri: imageUrl } : undefined}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            priority="high"
            transition={IMAGE_CONFIG.transition}
            cachePolicy={IMAGE_CONFIG.cachePolicy}
            placeholder={IMAGE_CONFIG.placeholder}
          />
        </Animated.View>

        {/* Dual Gradient Overlay for Cinematic Legibility */}
        <LinearGradient
          colors={['rgba(9, 9, 11, 0.15)', 'transparent', 'rgba(9, 9, 11, 0.75)', '#09090B']}
          locations={[0, 0.35, 0.75, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Slide Content */}
        <Animated.View style={[styles.content, animatedContentStyle]}>
          {/* Metadata Badges */}
          <View style={styles.badgeRow}>
            {item.vote_average > 0 && (
              <Badge rating={item.vote_average} variant="rating" />
            )}
            <Badge variant="hd" />
            <Text style={styles.genreText}>FEATURED</Text>
          </View>

          {/* Title */}
          <Text style={typography.heroTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Overview preview */}
          {item.overview ? (
            <Text style={styles.overviewText} numberOfLines={2}>
              {item.overview}
            </Text>
          ) : null}

          {/* Action CTAs */}
          <View style={styles.buttonRow}>
            {/* Primary Watch Button */}
            <Pressable
              onPress={handlePress}
              style={styles.playButton}
              accessibilityRole="button"
              accessibilityLabel={`Watch ${item.title}`}
            >
              <Ionicons name="play" size={18} color="#FFF" />
              <Text style={styles.playButtonText}>Watch Now</Text>
            </Pressable>

            {/* Watchlist Toggle Button */}
            <Pressable
              onPress={handleWatchlist}
              style={[
                styles.watchlistButton,
                isInWatchlist && styles.watchlistButtonActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Add to Watchlist"
            >
              <Ionicons
                name={isInWatchlist ? 'checkmark' : 'add'}
                size={20}
                color={isInWatchlist ? colors.primary : '#FFF'}
              />
              <Text
                style={[
                  styles.watchlistButtonText,
                  isInWatchlist && { color: colors.primary },
                ]}
              >
                {isInWatchlist ? 'In Watchlist' : 'Watchlist'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    );
  }
);

HeroSlide.displayName = 'HeroSlide';

const styles = StyleSheet.create({
  container: {
    height: metrics.heroHeight,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  content: {
    position: 'absolute',
    bottom: 28,
    left: metrics.screenHorizontalPadding,
    right: metrics.screenHorizontalPadding,
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  genreText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  overviewText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  playButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  watchlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  watchlistButtonActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    borderColor: colors.primary,
  },
  watchlistButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
