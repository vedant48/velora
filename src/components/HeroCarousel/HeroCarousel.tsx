import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { MediaItem } from '../../api/types';
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

    const { isInWatchlist, toggleWatchlist } = useWatchlist();

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
              onWatchlistPress={toggleWatchlist}
              isInWatchlist={isInWatchlist(item.id)}
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
