import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Shimmer } from './Shimmer';
import { metrics } from '../../theme/metrics';

interface MovieCardSkeletonProps {
  width?: number;
  height?: number;
  hasMarginRight?: boolean;
}

export const MovieCardSkeleton: React.FC<MovieCardSkeletonProps> = React.memo(
  ({
    width = metrics.posterWidth,
    height = metrics.posterHeight,
    hasMarginRight = false,
  }) => {
    return (
      <View
        style={[
          styles.container,
          { width, height, marginRight: hasMarginRight ? metrics.carouselItemGap : 0 },
        ]}
      >
        <Shimmer style={styles.poster} borderRadius={metrics.posterBorderRadius} />
        <Shimmer style={styles.title} borderRadius={4} />
        <Shimmer style={styles.subtitle} borderRadius={3} />
      </View>
    );
  }
);

MovieCardSkeleton.displayName = 'MovieCardSkeleton';

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  poster: {
    width: '100%',
    height: '78%',
  },
  title: {
    width: '85%',
    height: 12,
    marginTop: 8,
  },
  subtitle: {
    width: '50%',
    height: 10,
    marginTop: 4,
  },
});
