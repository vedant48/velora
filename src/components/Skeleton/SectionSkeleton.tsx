import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Shimmer } from './Shimmer';
import { MovieCardSkeleton } from './MovieCardSkeleton';
import { metrics } from '../../theme/metrics';

interface SectionSkeletonProps {
  cardWidth?: number;
  cardHeight?: number;
}

export const SectionSkeleton: React.FC<SectionSkeletonProps> = React.memo(
  ({ cardWidth = metrics.posterWidth, cardHeight = metrics.posterHeight }) => {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Shimmer style={styles.title} borderRadius={5} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          contentContainerStyle={styles.scrollContent}
        >
          <MovieCardSkeleton width={cardWidth} height={cardHeight} hasMarginRight={true} />
          <MovieCardSkeleton width={cardWidth} height={cardHeight} hasMarginRight={true} />
          <MovieCardSkeleton width={cardWidth} height={cardHeight} hasMarginRight={true} />
        </ScrollView>
      </View>
    );
  }
);

SectionSkeleton.displayName = 'SectionSkeleton';

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  header: {
    paddingHorizontal: metrics.screenHorizontalPadding,
    marginBottom: 10,
  },
  title: {
    width: 160,
    height: 18,
  },
  scrollContent: {
    paddingLeft: metrics.screenHorizontalPadding,
  },
});
