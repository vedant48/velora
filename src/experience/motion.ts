import { ReduceMotion } from 'react-native-reanimated';
/** Shared UI-thread motion values. These are design choices, not FPS claims. */
export const motion = {
  page: { damping: 26, stiffness: 240, mass: 0.85, reduceMotion: ReduceMotion.System },
  press: { damping: 18, stiffness: 300, mass: 0.5, reduceMotion: ReduceMotion.System },
  layoutMs: 220,
  firstImageMs: 120,
  stackMs: 220,
  edgeResistance: 0.18,
  swipeFraction: 0.22,
  flingVelocity: 650,
} as const;
