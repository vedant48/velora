import React, { useEffect } from 'react';
import { ViewStyle, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';

interface ShimmerProps {
  style?: ViewStyle | ViewStyle[];
  borderRadius?: number;
}

export const Shimmer: React.FC<ShimmerProps> = ({ style, borderRadius = 8 }) => {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.8, {
        duration: 900,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.shimmerBase,
        { borderRadius },
        style,
        animatedStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  shimmerBase: {
    backgroundColor: colors.surfaceLight,
    overflow: 'hidden',
  },
});
