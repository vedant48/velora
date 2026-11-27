import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';

export interface SegmentedOption<T extends string> {
  key: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (key: T) => void;
  testIDPrefix?: string;
  style?: StyleProp<ViewStyle>;
}

/** iOS-style segmented control shared by the Library tabs and the Explore filter. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  testIDPrefix,
  style,
}: SegmentedControlProps<T>) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.seg, style]}>
      {options.map((o) => (
        <Pressable
          key={o.key}
          testID={testIDPrefix ? `${testIDPrefix}-${o.key}` : undefined}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === o.key }}
          accessibilityLabel={o.label}
          onPress={() => onChange(o.key)}
          style={[styles.segItem, value === o.key && styles.segItemActive]}
        >
          <Text style={[styles.segText, value === o.key && styles.segTextActive]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    seg: {
      flexDirection: 'row',
      backgroundColor: colors.appleSegTrack,
      borderRadius: 10,
      padding: 2,
    },
    segItem: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8 },
    segItemActive: {
      backgroundColor: colors.appleSegActive,
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    segText: { fontSize: 13, fontWeight: '500', color: colors.appleText2 },
    segTextActive: { color: colors.appleText },
  });
