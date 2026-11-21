import { forwardRef } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { ui } from '../../theme/ui';

export const AppTextField = forwardRef<TextInput, TextInputProps>(function AppTextField({ style, multiline, ...props }, ref) {
  const { colors } = useAppTheme();
  return <TextInput ref={ref} placeholderTextColor={colors.textMuted} multiline={multiline}
    {...props} style={[{ minHeight: ui.control.minHeight, borderRadius: ui.radius.button,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
      paddingHorizontal: ui.space.md, paddingVertical: ui.space.md,
      color: colors.textPrimary, fontSize: ui.type.body,
      ...(multiline ? { textAlignVertical: 'top' as const } : {}) }, style]} />;
});
