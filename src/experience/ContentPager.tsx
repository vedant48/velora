import { pageAfterDrag, resistedOffset } from './pagerPolicy';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { motion } from './motion';

/** Persistent pages below a stationary screen header. Finger left goes next.
 * Translation and release run on the UI thread, not a stream of React updates.
 * Only settled/selected page identity crosses to JS. No page remount on switch.
 */
export function ContentPager({ index, onIndexChange, children, enabled = true }: {
  index: number; onIndexChange: (index: number) => void; children: React.ReactNode[]; enabled?: boolean;
}) {
  const { width } = useWindowDimensions();
  const offset = useSharedValue(-index * width);
  const origin = useSharedValue(0);
  const selected = useSharedValue(index);
  const count = children.length;
  const [visited, setVisited] = useState<Set<number>>(() => new Set([index]));
  useEffect(() => { setVisited(previous => new Set([...previous, index])); }, [index]);
  useEffect(() => {
    selected.value = index;
    offset.value = withSpring(-index * width, motion.page);
  }, [index, width]);
  const commit = useCallback((next: number) => onIndexChange(next), [onIndexChange]);
  const gesture = useMemo(() => Gesture.Pan().enabled(enabled)
    .activeOffsetX([-14, 14]).failOffsetY([-12, 12])
    .onStart(() => { cancelAnimation(offset); origin.value = offset.value; })
    .onUpdate(e => {
      const next = origin.value + e.translationX;
      offset.value = resistedOffset(next, count, width);
    })
    .onEnd((e, success) => {
      if (!success) return;
      const next = pageAfterDrag(selected.value, count, e.translationX, e.velocityX, width);
      selected.value = next;
      offset.value = withSpring(-next * width, { ...motion.page, velocity: e.velocityX });
      runOnJS(commit)(next);
    })
    .onFinalize((_e, success) => { if (!success) offset.value = withSpring(-selected.value * width, motion.page); }),
  [enabled, width, count, commit]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  return <GestureDetector gesture={gesture}><View style={{ flex: 1, overflow: 'hidden' }}>
    <Animated.View style={[{ flex: 1, width: width * count, flexDirection: 'row' }, style]}>
      {children.map((child, page) => <View key={page} style={{ width, height: '100%' }} accessibilityElementsHidden={index !== page} importantForAccessibility={index === page ? 'auto' : 'no-hide-descendants'}>{visited.has(page) || Math.abs(index - page) <= 1 ? child : null}</View>)}
    </Animated.View>
  </View></GestureDetector>;
}
