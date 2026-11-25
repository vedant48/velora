import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LibraryStatus } from '../../api/velora';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { ui } from '../../theme/ui';

const OPTIONS: { key: LibraryStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'want', label: 'Want', icon: 'bookmark-outline' },
  { key: 'watching', label: 'Watching', icon: 'play-outline' },
  { key: 'watched', label: 'Watched', icon: 'checkmark-circle-outline' },
];

interface StatusPickerProps {
  status: LibraryStatus | null;
  onChange: (status: LibraryStatus | null) => void;
}

/** Must-style list membership: tap to set, tap again to remove. */
export const StatusPicker = memo(function StatusPicker({ status, onChange }: StatusPickerProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const active = status === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(active ? null : opt.key)}
            style={[styles.option, active && styles.optionActive]}
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: active }}
          >
            <Ionicons name={opt.icon} size={15} color={active ? '#000' : colors.textSecondary} />
            <Text style={[styles.optionText, active && styles.optionTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const createStyles = (colors: AppColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: ui.space.sm,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  optionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: ui.type.label,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: '#fff',
  },
});
