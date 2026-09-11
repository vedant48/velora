import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AnimatedSplashProps {
  onFinish: () => void;
}

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ onFinish }) => {
  // Shared Values for animation sequence
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const leftRibbonHeight = useSharedValue(0);
  const rightRibbonHeight = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textLetterSpacing = useSharedValue(2);
  const containerOpacity = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    // 1. Initial spring scale and fade in of the V logo
    logoOpacity.value = withTiming(1, { duration: 350 });
    logoScale.value = withSpring(1, {
      damping: 12,
      stiffness: 140,
      mass: 0.8,
    });

    // 2. Ribbons grow downwards
    leftRibbonHeight.value = withTiming(1, {
      duration: 600,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    rightRibbonHeight.value = withDelay(
      150,
      withTiming(1, {
        duration: 600,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );

    // 3. Ambient Crimson Glow pulse
    glowOpacity.value = withDelay(
      400,
      withSequence(
        withTiming(0.85, { duration: 500 }),
        withTiming(0.4, { duration: 600 })
      )
    );

    // 4. Reveal "VELORA" typography with expanding letter-spacing
    textOpacity.value = withDelay(750, withTiming(1, { duration: 500 }));
    textLetterSpacing.value = withDelay(
      750,
      withTiming(6, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      })
    );

    // 5. Cinematic Zoom into camera & Dissolve (like Netflix Ta-dum zoom)
    const timer = setTimeout(() => {
      logoScale.value = withTiming(3.6, {
        duration: 650,
        easing: Easing.in(Easing.cubic),
      });
      containerOpacity.value = withTiming(
        0,
        {
          duration: 600,
          easing: Easing.out(Easing.ease),
        },
        (finished) => {
          if (finished) {
            runOnJS(onFinish)();
          }
        }
      );
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  const handleSkip = () => {
    containerOpacity.value = withTiming(0, { duration: 250 }, () => {
      runOnJS(onFinish)();
    });
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    letterSpacing: textLetterSpacing.value,
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      <Pressable onPress={handleSkip} style={StyleSheet.absoluteFill}>
        {/* Deep Cosmic Background with Radial Crimson Ambient */}
        <LinearGradient
          colors={['#000000', '#090003', '#000000']}
          style={StyleSheet.absoluteFill}
        />

        {/* Ambient Pulsing Crimson Glow behind the logo */}
        <Animated.View style={[styles.glowOrb, animatedGlowStyle]} />

        <View style={styles.centerContent}>
          {/* Netflix-Style Stylized 3D Ribbon "V" */}
          <Animated.View style={[styles.logoWrapper, animatedLogoStyle]}>
            {/* Left Angled Ribbon */}
            <View style={styles.ribbonLeft}>
              <LinearGradient
                colors={['#7E050B', '#B80710', '#E50914']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </View>

            {/* Right Angled Ribbon (Overlapping with 3D drop shadow) */}
            <View style={styles.ribbonRight}>
              <LinearGradient
                colors={['#E50914', '#FF2D39', '#8A050B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </View>

            {/* Central 3D Fold Shadow */}
            <View style={styles.centerFoldShadow} />
          </Animated.View>

          {/* Cinematic Velora Brand Name */}
          <Animated.Text style={[styles.brandText, animatedTextStyle]}>
            VELORA
          </Animated.Text>

          <Animated.Text style={[styles.subText, animatedTextStyle]}>
            STREAMING ORIGINAL
          </Animated.Text>
        </View>

        <Text style={styles.skipHint}>Tap anywhere to skip</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...(StyleSheet.absoluteFill as any),
    zIndex: 9999,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowOrb: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(229, 9, 20, 0.35)',
    top: SCREEN_HEIGHT * 0.5 - 140,
    left: SCREEN_WIDTH * 0.5 - 140,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  logoWrapper: {
    width: 110,
    height: 120,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  // Left arm of the "V"
  ribbonLeft: {
    position: 'absolute',
    width: 32,
    height: 120,
    borderRadius: 4,
    transform: [{ rotate: '-24deg' }, { translateX: -20 }],
    overflow: 'hidden',
    shadowColor: '#E50914',
    shadowOffset: { width: -4, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  // Right arm of the "V" (overlaps left arm)
  ribbonRight: {
    position: 'absolute',
    width: 32,
    height: 120,
    borderRadius: 4,
    transform: [{ rotate: '24deg' }, { translateX: 20 }],
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  centerFoldShadow: {
    position: 'absolute',
    bottom: 2,
    width: 22,
    height: 38,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 2,
    transform: [{ rotate: '-24deg' }],
  },
  brandText: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: 'rgba(229, 9, 20, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  subText: {
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
  },
  skipHint: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    color: 'rgba(255, 255, 255, 0.25)',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
