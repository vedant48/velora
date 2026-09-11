import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { metrics } from '../../theme/metrics';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onSeeAllPress?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = React.memo(
  ({ title, subtitle, onSeeAllPress }) => {
    return (
      <View style={styles.container}>
        <View style={styles.titleColumn}>
          <Text style={typography.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={typography.caption}>{subtitle}</Text> : null}
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

const styles = StyleSheet.create({
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
