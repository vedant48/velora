import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const metrics = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,

  // Poster card metrics (2:3 aspect ratio)
  posterWidth: 130,
  posterHeight: 195,
  posterBorderRadius: 10,

  // Wide backdrop card metrics (16:9 aspect ratio)
  backdropWidth: 260,
  backdropHeight: 146,
  backdropBorderRadius: 10,

  // Hero Carousel metrics
  heroHeight: Math.min(SCREEN_HEIGHT * 0.58, 480),
  heroWidth: SCREEN_WIDTH,

  // Spacing & padding
  spacingXs: 4,
  spacingSm: 8,
  spacingMd: 12,
  spacingLg: 16,
  spacingXl: 24,
  spacing2Xl: 32,

  // Horizontal list gap
  carouselItemGap: 12,
  screenHorizontalPadding: 16,

  // Header height
  headerHeight: 64,
  tabBarHeight: 60,
} as const;
