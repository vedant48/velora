import { StyleProp, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { ui } from '../../theme/ui';
import { Shimmer } from '../Skeleton/Shimmer';

/**
 * Generic busy placeholder: a pulsing skeleton bar (no spinner). Used where no
 * layout skeleton fits, such as inside buttons and for small in-place saves.
 * Screens that show content use the layout skeletons in components/Skeleton.
 */
export function AppLoader({ size = 'small', style, onAccent = false }: {
  size?: 'small' | 'large';
  style?: StyleProp<ViewStyle>;
  onAccent?: boolean;
}) {
  const { colors } = useAppTheme();
  const bar = ui.component.loader[size];
  return <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}
    accessibilityRole="progressbar" accessibilityLabel="Loading" accessibilityState={{ busy: true }}>
    <Shimmer style={{ width: bar.width, height: bar.height, ...(onAccent ? { backgroundColor: colors.appleCard } : null) }} borderRadius={ui.radius.pill} />
  </View>;
}
