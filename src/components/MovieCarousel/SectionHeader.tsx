import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { metrics } from '../../theme/metrics';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onSeeAllPress?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = React.memo(
  ({ title, subtitle, onSeeAllPress }) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
    return (
      <View style={styles.container}>
        <View style={styles.titleColumn}>
          <Text style={[typography.sectionTitle, { color: colors.textPrimary, fontSize: 22, letterSpacing: -0.2 }]}>{title}</Text>
          {subtitle ? <Text style={[typography.caption, { color: colors.textTertiary }]}>{subtitle}</Text> : null}
        </View>

        {onSeeAllPress && (
          <Pressable
            onPress={onSeeAllPress}
            style={styles.seeAllButton}
            hitSlop={8}
          >
            <Text style={styles.seeAllText}>See All</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        )}
      </View>
    );
  }
);

SectionHeader.displayName = 'SectionHeader';

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: metrics.screenHorizontalPadding,
    marginBottom: 10,
  },
  titleColumn: {
    flex: 1,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  seeAllText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
