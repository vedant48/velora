import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Shimmer } from './Shimmer';
import { metrics } from '../../theme/metrics';

export const HeroSkeleton: React.FC = React.memo(() => {
  return (
    <View style={styles.container}>
      <Shimmer style={styles.backdrop} borderRadius={0} />
      <View style={styles.contentOverlay}>
        <Shimmer style={styles.tagline} borderRadius={4} />
        <Shimmer style={styles.title} borderRadius={6} />
        <View style={styles.buttonRow}>
          <Shimmer style={styles.buttonPrimary} borderRadius={8} />
          <Shimmer style={styles.buttonSecondary} borderRadius={8} />
        </View>
      </View>
    </View>
  );
});

HeroSkeleton.displayName = 'HeroSkeleton';

const styles = StyleSheet.create({
  container: {
    width: metrics.screenWidth,
    height: metrics.heroHeight,
    backgroundColor: '#09090B',
    position: 'relative',
    overflow: 'hidden',
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 24,
    left: metrics.screenHorizontalPadding,
    right: metrics.screenHorizontalPadding,
  },
  tagline: {
    width: 140,
    height: 14,
    marginBottom: 10,
  },
  title: {
    width: '75%',
    height: 32,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonPrimary: {
    width: 120,
    height: 42,
  },
  buttonSecondary: {
    width: 120,
    height: 42,
  },
});
