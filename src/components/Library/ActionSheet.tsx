import { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { ui } from '../../theme/ui';
import { BottomSheet } from '../common/BottomSheet';

export interface ActionSheetOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  options: ActionSheetOption[];
  onClose: () => void;
  showCancel?: boolean;
  dismissOnSelect?: boolean;
}

/** Must-style bottom action sheet over a dimmed backdrop. */
export const ActionSheet = memo(function ActionSheet({
  visible,
  options,
  onClose,
  showCancel = true,
  dismissOnSelect = true,
}: ActionSheetProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <BottomSheet visible={visible} onClose={onClose}>
          {options.map((opt, i) => (
            <Pressable
              key={opt.label}
              accessibilityLabel={opt.label}
              onPress={() => {
                if (dismissOnSelect) onClose();
                opt.onPress();
              }}
              style={({ pressed }) => [styles.option, i > 0 && styles.optionSep, pressed && styles.optionPressed]}
              accessibilityRole="button"
            >
              <Text style={[styles.optionText, opt.destructive && styles.destructiveText]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
          {showCancel && (
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.option, styles.cancel, pressed && styles.optionPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.optionText}>Cancel</Text>
            </Pressable>
          )}
    </BottomSheet>
  );
});

const createStyles = (colors: AppColors) => StyleSheet.create({
  option: {
    alignItems: 'center',
    paddingVertical: ui.space.lg,
    minHeight: ui.control.minHeight,
  },
  optionPressed: {
    backgroundColor: colors.surface,
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: ui.type.body,
    fontWeight: '600',
  },
  optionSep: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.appleSeparator,
  },
  destructiveText: {
    color: colors.error,
  },
  cancel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: ui.space.xs,
  },
});
