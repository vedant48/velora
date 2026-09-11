import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FlashList, ListRenderItem, ViewToken } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { MediaItem } from '../../api/types';
import { MovieCard } from '../MovieCard/MovieCard';
import { SectionHeader } from './SectionHeader';
import { SectionSkeleton } from '../Skeleton/SectionSkeleton';
import { prefetchImagesWindow, getImageUrl } from '../../utils/image';
import { metrics } from '../../theme/metrics';
import { colors } from '../../theme/colors';

interface MovieCarouselProps {
  title: string;
  subtitle?: string;
  data?: MediaItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onItemPress: (item: MediaItem) => void;
  onSeeAllPress?: () => void;
  showRank?: boolean;
  cardWidth?: number;
  cardHeight?: number;
  progressMap?: Record<number, { progress: number; duration: number }>;
}

export const MovieCarousel: React.FC<MovieCarouselProps> = React.memo(
  ({
    title,
    subtitle,
    data = [],
    isLoading = false,
    isError = false,
    onRetry,
    onItemPress,
    onSeeAllPress,
    showRank = false,
    cardWidth = metrics.posterWidth,
    cardHeight = metrics.posterHeight,
    progressMap,
  }) => {
    // Intelligent viewport prefetching window
    const lastPrefetchedIndex = useRef<number>(-1);

    const onViewableItemsChanged = useCallback(
      ({ viewableItems }: { viewableItems: ViewToken<MediaItem>[] }) => {
        if (!viewableItems || viewableItems.length === 0 || !data.length) return;
        const maxIndex = Math.max(...viewableItems.map((v) => v.index ?? 0));

        // When user scrolls towards the end of current view, prefetch next 3 upcoming items
        if (maxIndex > lastPrefetchedIndex.current) {
          lastPrefetchedIndex.current = maxIndex;
          const upcomingSlice = data.slice(maxIndex + 1, maxIndex + 4);
          const urlsToPrefetch = upcomingSlice.map((item) =>
            getImageUrl(item.poster_path || item.backdrop_path, 'poster')
          );
          prefetchImagesWindow(urlsToPrefetch);
        }
      },
      [data]
    );

    const viewabilityConfig = useRef({
      itemVisiblePercentThreshold: 40,
    }).current;

    const renderItem: ListRenderItem<MediaItem> = useCallback(
      ({ item, index }) => {
        const itemProgress = progressMap?.[item.id];
        return (
          <MovieCard
            item={item}
            onPress={onItemPress}
            width={cardWidth}
            height={cardHeight}
            rank={showRank ? index + 1 : undefined}
            progress={itemProgress?.progress}
            duration={itemProgress?.duration}
          />
        );
      },
      [cardWidth, cardHeight, onItemPress, progressMap, showRank]
    );

    const keyExtractor = useCallback((item: MediaItem) => item.id.toString(), []);

    if (isLoading) {
      return <SectionSkeleton cardWidth={cardWidth} cardHeight={cardHeight} />;
    }

    if (isError) {
      return (
        <View style={styles.container}>
          <SectionHeader title={title} subtitle={subtitle} />
          <View style={styles.errorContainer}>
            <Ionicons name="cloud-offline-outline" size={24} color={colors.textTertiary} />
            <Text style={styles.errorText}>Unable to load {title.toLowerCase()}</Text>
            {onRetry && (
              <Pressable onPress={onRetry} style={styles.retryButton} hitSlop={8}>
                <Ionicons name="refresh" size={14} color={colors.primary} />
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            )}
          </View>
        </View>
      );
    }

    if (!data || data.length === 0) {
      return null;
    }

    return (
      <View style={styles.container}>
        <SectionHeader
          title={title}
          subtitle={subtitle}
          onSeeAllPress={onSeeAllPress}
        />
        <FlashList
          horizontal
          data={data}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          contentContainerStyle={{
            paddingLeft: metrics.screenHorizontalPadding,
            paddingRight: metrics.screenHorizontalPadding,
          }}
          drawDistance={metrics.screenWidth}
        />
      </View>
    );
  }
);

MovieCarousel.displayName = 'MovieCarousel';

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    marginHorizontal: metrics.screenHorizontalPadding,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    borderRadius: 6,
  },
  retryText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});
