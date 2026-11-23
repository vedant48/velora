import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, ReduceMotion } from 'react-native-reanimated';
import { motion } from './motion';
/** Measure once at natural width; animate geometry, never mount-snap a panel. */
export function Expandable({ open, children }: { open: boolean; children: React.ReactNode }) {
  const [height, setHeight] = useState(0);
  const expansion = useSharedValue(0);
  useEffect(() => { expansion.value = withTiming(open ? height : 0, { duration: motion.layoutMs, reduceMotion: ReduceMotion.System }); }, [open, height]);
  const style = useAnimatedStyle(() => ({ height: expansion.value, opacity: height ? Math.min(1, expansion.value / height) : 0 }));
  return <Animated.View style={[{ overflow: 'hidden' }, style]} pointerEvents={open ? 'auto' : 'none'} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}>
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }} onLayout={e => setHeight(e.nativeEvent.layout.height)}>{children}</View>
  </Animated.View>;
}
