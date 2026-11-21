import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface RatingChipProps {
  value: number;
  selected: boolean;
  onSelect: (value: number | null) => void;
}

/** 0-10 chip with UI-thread spring feedback. */
const RatingChip = memo(function RatingChip({ value, selected, onSelect }: RatingChipProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(0.85, { damping: 12, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
      }}
      onPress={() => onSelect(selected ? null : value)}
      style={[styles.chip, selected && styles.chipSelected, style]}
      accessibilityLabel={`Rate ${value} out of 10`}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{value}</Text>
    </AnimatedPressable>
  );
});

interface RatingPickerProps {
  rating: number | null;
  onChange: (rating: number | null) => void;
}

/** Must-style 0-10 rating row. */
export const RatingPicker = memo(function RatingPicker({ rating, onChange }: RatingPickerProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const handleSelect = useCallback((v: number | null) => onChange(v), [onChange]);
  return (
    <View style={styles.row}>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
        <RatingChip key={v} value={v} selected={rating === v} onSelect={handleSelect} />
      ))}
    </View>
  );
});

const createStyles = (colors: AppColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  chipSelected: {
    backgroundColor: colors.accentAmber,
    borderColor: colors.accentAmber,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: '#000',
  },
});
