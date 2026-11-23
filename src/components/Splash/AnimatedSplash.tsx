import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useAppTheme } from '../../theme/ThemeContext';

// Original Velora ribbon-V mark (assets/velora-v.png), brand red on both themes.
const V_MARK = require('../../../assets/velora-v.png');
// Soft radial red bloom rendered as an asset (RN views cannot blur).
const GLOW = require('../../../assets/splash-glow.png');

interface AnimatedSplashProps {
  /** True once the app (theme preference + navigation) is ready to show. */
  appReady: boolean;
  onFinish: () => void;
  /** Called once the overlay's first frame has painted (native splash handoff). */
  onFirstFrame?: () => void;
}

/**
 * Cinematic V -> VELORA splash.
 *
 * Sequence: the ribbon V springs in, the VELORA wordmark reveals out of it,
 * then the whole layer crossfades into the app. Dismissal is driven by app
 * readiness plus the short reveal beat - there is no fixed artificial hold.
 * A hard fallback timer guarantees the app is never trapped behind it.
 *
 * Theme: background and wordmark follow the resolved app theme (light or
 * dark, System included), so there is no theme flash when a saved override
 * differs from the device appearance once JS is running. The native splash
 * that shows before JS follows the device appearance; a saved override that
 * differs from the device theme can only be corrected once JS loads.
 */
const MIN_REVEAL_MS = 1350;
const MAX_HOLD_MS = 4500;

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ appReady, onFinish, onFirstFrame }) => {
  const { colors } = useAppTheme();

  // The sequence is anchored to the overlay's first painted frame, not to JS
  // mount: on slow renderers paint can lag mount by a second or more, and a
  // mount-based clock can play the V/wordmark beats entirely off-screen.
  const [painted, setPainted] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);

  useEffect(() => {
    // Bounded decode failure fallback. Never leave the app behind native splash.
    const timeout = setTimeout(() => setLogoLoaded(true), 2200);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!laidOut || !logoLoaded || painted) return;
    const frame = requestAnimationFrame(() => {
      setPainted(true);
      onFirstFrame?.();
    });
    return () => cancelAnimationFrame(frame);
  }, [laidOut, logoLoaded, painted, onFirstFrame]);

  const logoScale = useSharedValue(1);
  const logoOpacity = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const wordOpacity = useSharedValue(0);
  const wordSpacing = useSharedValue(0);
  const wordTranslate = useSharedValue(10);
  const containerOpacity = useSharedValue(1);
  const exitScale = useSharedValue(1);

  const startedAt = useRef(Date.now());
  const finishing = useRef(false);

  const finish = () => {
    if (finishing.current) return;
    finishing.current = true;
    // Smooth continuous handoff: gentle forward scale + crossfade, no hard cut.
    exitScale.value = withTiming(1.06, { duration: 430, easing: Easing.out(Easing.cubic) });
    containerOpacity.value = withTiming(
      0,
      { duration: 430, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onFinish)();
      },
    );
  };

  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    if (!painted) return;
    startedAt.current = Date.now();
    // 1. V enters: quick fade + spring settle.
    logoOpacity.value = withTiming(1, { duration: 260 });
    logoScale.value = withSpring(1, { damping: 13, stiffness: 150, mass: 0.7 });

    // 2. Ambient glow blooms once, then rests low.
    glowOpacity.value = withDelay(
      200,
      withSequence(
        withTiming(0.75, { duration: 520, easing: Easing.out(Easing.cubic) }),
        withTiming(0.38, { duration: 700 }),
      ),
    );

    // 3. VELORA reveals out of the V: opacity, letter-spacing, slight rise.
    wordOpacity.value = withDelay(430, withTiming(1, { duration: 480 }));
    wordSpacing.value = withDelay(
      430,
      withTiming(8, { duration: 640, easing: Easing.out(Easing.cubic) }),
    );
    wordTranslate.value = withDelay(
      430,
      withTiming(0, { duration: 560, easing: Easing.out(Easing.cubic) }),
    );

    // Safety: never trap startup behind the splash.
    const hard = setTimeout(() => finishRef.current(), MAX_HOLD_MS);
    return () => clearTimeout(hard);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [painted]);

  useEffect(() => {
    if (!appReady || !painted) return;
    const elapsed = Date.now() - startedAt.current;
    const remaining = Math.max(MIN_REVEAL_MS - elapsed, 0);
    const t = setTimeout(() => finishRef.current(), remaining);
    return () => clearTimeout(t);
  }, [appReady, painted]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: exitScale.value }],
  }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    letterSpacing: wordSpacing.value,
    transform: [{ translateY: wordTranslate.value }],
  }));

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: colors.background }, containerStyle]}
      onLayout={() => setLaidOut(true)}
    >
      <Animated.View style={[styles.glow, glowStyle]}>
        <Image source={GLOW} style={styles.glowImage} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[styles.logo, logoStyle]}>
        <Image source={V_MARK} style={styles.logoImage} contentFit="contain" onLoad={() => setLogoLoaded(true)} onError={() => setLogoLoaded(true)} />
      </Animated.View>
      <Animated.Text style={[styles.wordmark, { color: colors.textPrimary }, wordStyle]}>
        VELORA
      </Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 340,
    height: 340,
    // faint ambient bloom behind the mark
    opacity: 0,
  },
  glowImage: {
    width: '100%',
    height: '100%',
  },
  logo: {
    width: 148,
    height: 148,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  wordmark: {
    marginTop: 18,
    fontSize: 30,
    fontWeight: '800',
    includeFontPadding: false,
  },
});
