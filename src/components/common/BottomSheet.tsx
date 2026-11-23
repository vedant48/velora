import { motion } from '../../experience/motion';
import React, { useEffect, useMemo } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import { ui } from '../../theme/ui';

/** Shared native sheet: backdrop, Android back and downward drag all dismiss. */
export function BottomSheet({ visible, onClose, children, showHandle = false, contentStyle }: {
  visible: boolean; onClose: () => void; children: React.ReactNode;
  showHandle?: boolean; contentStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const offset = useSharedValue(0);
  const height = useSharedValue(600);
  useEffect(() => { if (visible) offset.value = 0; }, [visible, offset]);
  const pan = useMemo(() => Gesture.Pan().activeOffsetY(8).failOffsetX([-20, 20])
    .onUpdate(event => { offset.value = Math.max(0, event.translationY); })
    .onEnd((event, success) => {
      if (!success) { offset.value = withSpring(0, motion.page); return; }
      if (event.translationY > 80 || (event.velocityY > 800 && event.translationY > 15)) {
        offset.value = withTiming(height.value + 40, { duration: motion.layoutMs }, finished => { if (finished) runOnJS(onClose)(); });
      } else { offset.value = withSpring(0, motion.page); }
    }), [height, offset, onClose]);
  const moving = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));
  const handle = <Animated.View accessibilityLabel="Drag sheet to dismiss" style={{paddingTop: 8, paddingBottom: 12}}>
    <View style={{alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderHighlight}} />
  </Animated.View>;
  const sheet = <Animated.View onLayout={e => { height.value = e.nativeEvent.layout.height; }} style={[{
    backgroundColor: colors.cardBackground, borderTopLeftRadius: ui.radius.sheet,
    borderTopRightRadius: ui.radius.sheet, paddingBottom: Math.max(insets.bottom, ui.space.lg),
  }, contentStyle, moving]}>
    {/* Text entry/scrolling keeps native gestures; only its handle drags the sheet. */}
    {showHandle && <GestureDetector gesture={pan}>{handle}</GestureDetector>}
    {children}
  </Animated.View>;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <GestureHandlerRootView style={{flex: 1}}>
      <KeyboardAvoidingView style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.72)'}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={{flex: 1}} accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onClose} />
        {showHandle ? sheet : <GestureDetector gesture={pan}>{sheet}</GestureDetector>}
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  </Modal>;
}
