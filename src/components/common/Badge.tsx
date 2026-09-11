import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface BadgeProps {
  rating?: number;
  label?: string;
  variant?: 'rating' | 'hd' | 'type' | 'default';
}

export const Badge: React.FC<BadgeProps> = React.memo(
  ({ rating, label, variant = 'default' }) => {
    if (variant === 'rating' && rating !== undefined) {
      return (
        <View style={[styles.badge, styles.ratingBadge]}>
          <Ionicons name="star" size={11} color={colors.accentAmber} style={styles.starIcon} />
          <Text style={styles.ratingText}>{rating > 0 ? rating.toFixed(1) : 'NR'}</Text>
        </View>
      );
    }

    if (variant === 'hd') {
      return (
        <View style={[styles.badge, styles.hdBadge]}>
          <Text style={styles.hdText}>4K HDR</Text>
        </View>
      );
    }

    return (
      <View style={[styles.badge, styles.defaultBadge]}>
        <Text style={styles.defaultText}>{label}</Text>
      </View>
    );
  }
);

Badge.displayName = 'Badge';

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  ratingBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  starIcon: {
    marginRight: 3,
  },
  ratingText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  hdBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  hdText: {
    color: colors.textPrimary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  defaultBadge: {
    backgroundColor: colors.surfaceLight,
  },
  defaultText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
});
