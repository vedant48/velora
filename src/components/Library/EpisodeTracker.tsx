import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';

interface EpisodeTrackerProps {
  watched: number;
  total: number;
  onChange: (watched: number) => void;
}

/** Must-style "N episodes left" tracker. */
export const EpisodeTracker = memo(function EpisodeTracker({ watched, total, onChange }: EpisodeTrackerProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const left = Math.max(total - watched, 0);
  const progress = total > 0 ? Math.min(watched / total, 1) : 0;
  return (
    <View style={styles.container}>
      <View style={styles.infoRow}>
        <Text style={styles.label}>
          {total > 0 ? `${watched}/${total} episodes` : `${watched} episodes watched`}
        </Text>
        {total > 0 && <Text style={styles.left}>{left === 0 ? 'Complete' : `${left} left`}</Text>}
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { flex: progress }]} />
        <View style={{ flex: 1 - progress }} />
      </View>
      <View style={styles.buttons}>
        <Pressable
          onPress={() => onChange(Math.max(watched - 1, 0))}
          style={styles.stepButton}
          accessibilityLabel="One episode less"
        >
          <Ionicons name="remove" size={18} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          onPress={() => onChange(total > 0 ? Math.min(watched + 1, total) : watched + 1)}
          style={[styles.stepButton, styles.stepButtonPrimary]}
          accessibilityLabel="One episode watched"
        >
          <Ionicons name="add" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
});

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  left: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accentCyan,
  },
  barTrack: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  stepButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  stepButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
