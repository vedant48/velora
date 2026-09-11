import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { metrics } from '../../theme/metrics';

interface HeroPaginationProps {
  total: number;
  scrollX: SharedValue<number>;
}

const Dot: React.FC<{ index: number; scrollX: SharedValue<number> }> = React.memo(
  ({ index, scrollX }) => {
    const width = metrics.screenWidth;

    const animatedDotStyle = useAnimatedStyle(() => {
      const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

      // Pill width stretches when active (6px -> 20px)
      const dotWidth = interpolate(
        scrollX.value,
        inputRange,
        [6, 22, 6],
        Extrapolation.CLAMP
      );

      const opacity = interpolate(
        scrollX.value,
        inputRange,
        [0.35, 1, 0.35],
        Extrapolation.CLAMP
      );

      return {
        width: dotWidth,
        opacity,
      };
    });

    return <Animated.View style={[styles.dot, animatedDotStyle]} />;
  }
);

Dot.displayName = 'HeroPaginationDot';

export const HeroPagination: React.FC<HeroPaginationProps> = React.memo(
  ({ total, scrollX }) => {
    if (total <= 1) return null;

    return (
      <View style={styles.container}>
        {Array.from({ length: total }).map((_, i) => (
          <Dot key={i} index={i} scrollX={scrollX} />
        ))}
      </View>
    );
  }
);

HeroPagination.displayName = 'HeroPagination';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
});
