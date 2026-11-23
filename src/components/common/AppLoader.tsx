import { ActivityIndicator, StyleProp, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

/** One native circular animation across pages, pagination and small actions. */
export function AppLoader({ size = 'small', style, onAccent = false, refresh = false }: {
  size?: 'small' | 'large';
  style?: StyleProp<ViewStyle>;
  onAccent?: boolean;
  refresh?: boolean;
}) {
  const { colors } = useAppTheme();
  return <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}
    accessibilityRole="progressbar" accessibilityLabel="Loading" accessibilityState={{ busy: true }}>
    <ActivityIndicator size={size} color={refresh ? '#000000' : onAccent ? '#FFFFFF' : colors.primary} />
  </View>;
}
