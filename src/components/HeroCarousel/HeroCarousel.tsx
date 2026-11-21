import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MediaItem } from '../../api/types';
import { veloraApi } from '../../api/velora';
import { useAuth } from '../../state/AuthContext';
import { HeroSlide } from './HeroSlide';
import { HeroPagination } from './HeroPagination';
import { HeroSkeleton } from '../Skeleton/HeroSkeleton';
import { useWatchlist } from '../../hooks/useWatchlist';
import { metrics } from '../../theme/metrics';

interface HeroCarouselProps {
  items: MediaItem[];
  isLoading?: boolean;
  onItemPress: (item: MediaItem) => void;
  autoplayIntervalMs?: number;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = React.memo(
  ({
    items,
    isLoading = false,
    onItemPress,
    autoplayIntervalMs = 6000,
  }) => {
    const scrollX = useSharedValue(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const currentIndex = useRef(0);
    const isInteracting = useRef(false);
    const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Want toggle ("Want" is the unified watchlist, user direction 21 Nov):
    // signed-in state comes from the server library; signed-out keeps the
    // legacy local watchlist, which migrates into library Want on login.
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { isInWatchlist, toggleWatchlist } = useWatchlist();
    const libraryQuery = useQuery({
      queryKey: ['library'],
      queryFn: () => veloraApi.getLibrary(),
      enabled: !!user,
    });
    const libraryStatus = new Map(
      (libraryQuery.data?.items ?? []).map((i) => [`${i.media_type}-${i.tmdb_id}`, i.status]),
    );
    const wantMutation = useMutation({
      mutationFn: async (item: MediaItem) => {
        const mediaType = item.media_type ?? 'movie';
        const status = libraryStatus.get(`${mediaType}-${item.id}`);
        if (status === 'want') {
          await veloraApi.removeItem(mediaType, item.id);
        } else {
          await veloraApi.upsertItem({
            mediaType,
            tmdbId: item.id,
            title: item.title,
            posterPath: item.poster_path,
            backdropPath: item.backdrop_path,
            releaseDate: item.release_date ?? null,
            status: 'want',
          });
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['library'] });
      },
    });

    const isWanted = useCallback(
      (item: MediaItem) => {
        if (!user) return isInWatchlist(item.id);
        return libraryStatus.get(`${item.media_type ?? 'movie'}-${item.id}`) === 'want';
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [user, libraryQuery.data, isInWatchlist],
    );

    const handleWantPress = useCallback(
      (item: MediaItem) => {
        if (!user) {
          toggleWatchlist(item);
          return;
        }
        wantMutation.mutate(item);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [user, toggleWatchlist],
    );

    // UI-thread worklet scroll handler (0 JS bridge re-renders)
    const scrollHandler = useAnimatedScrollHandler({
      onScroll: (event) => {
        scrollX.value = event.contentOffset.x;
      },
    });

    // Pause autoplay during user gesture
    const handleScrollBeginDrag = useCallback(() => {
      isInteracting.current = true;
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    }, []);

    const handleScrollEndDrag = useCallback(() => {
      // Resume autoplay 4 seconds after user finishes swipe
      resumeTimer.current = setTimeout(() => {
        isInteracting.current = false;
      }, 4000);
    }, []);

    const handleMomentumScrollEnd = useCallback(
      (event: any) => {
        const offset = event.nativeEvent.contentOffset.x;
        currentIndex.current = Math.round(offset / metrics.screenWidth);
      },
      []
    );

    // Controlled, low-overhead autoplay loop
    useEffect(() => {
      if (isLoading || items.length <= 1) return;

      const interval = setInterval(() => {
        if (!isInteracting.current && scrollViewRef.current) {
          const nextIndex = (currentIndex.current + 1) % items.length;
          currentIndex.current = nextIndex;
          scrollViewRef.current.scrollTo({
            x: nextIndex * metrics.screenWidth,
            animated: true,
          });
        }
      }, autoplayIntervalMs);

      return () => {
        clearInterval(interval);
        if (resumeTimer.current) clearTimeout(resumeTimer.current);
      };
    }, [isLoading, items.length, autoplayIntervalMs]);

    if (isLoading) {
      return <HeroSkeleton />;
    }

    if (!items || items.length === 0) {
      return null;
    }

    return (
      <View style={styles.container}>
        <Animated.ScrollView
          ref={scrollViewRef as any}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={scrollHandler}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          decelerationRate="fast"
          snapToInterval={metrics.screenWidth}
          style={styles.scroll}
        >
          {items.map((item, index) => (
            <HeroSlide
              key={item.id}
              item={item}
              index={index}
              scrollX={scrollX}
              onPress={onItemPress}
              onWatchlistPress={handleWantPress}
              isInWatchlist={isWanted(item)}
            />
          ))}
        </Animated.ScrollView>

        {/* UI-thread Animated Pagination Pills */}
        <HeroPagination total={items.length} scrollX={scrollX} />
      </View>
    );
  }
);

HeroCarousel.displayName = 'HeroCarousel';

const styles = StyleSheet.create({
  container: {
    height: metrics.heroHeight,
    position: 'relative',
    backgroundColor: '#09090B',
  },
  scroll: {
    flex: 1,
  },
});
