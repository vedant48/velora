import React from 'react';
import { Pressable, StyleProp, Text, ViewStyle } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { ui } from '../../theme/ui';
import { AppLoader } from './AppLoader';

export function AppButton({ title, onPress, variant = 'primary', loading = false, disabled = false, icon, style, accessibilityLabel }: {
  title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean; disabled?: boolean; icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const { colors } = useAppTheme();
  const filled = variant === 'primary';
  const foreground = filled ? '#FFFFFF' : variant === 'danger' ? colors.error : colors.textPrimary;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title}
    accessibilityState={{ disabled: disabled || loading, busy: loading }} disabled={disabled || loading} onPress={onPress}
    style={({ pressed }) => [{ minHeight: ui.control.minHeight, borderRadius: ui.radius.button,
      paddingHorizontal: ui.space.lg, paddingVertical: ui.space.md, gap: ui.space.sm,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: filled ? colors.primary : colors.surface,
      borderWidth: variant === 'danger' ? 1 : 0, borderColor: colors.error,
      opacity: disabled || pressed ? 0.6 : 1 }, style]}>
    {loading ? <AppLoader onAccent={filled} /> : <>{icon}<Text style={{ color: foreground, fontSize: ui.type.body, fontWeight: '700' }}>{title}</Text></>}
  </Pressable>;
}
