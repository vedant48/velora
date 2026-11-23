import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../state/AuthContext';
import { Avatar } from '../Avatar';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { metrics } from '../../theme/metrics';

export type ContentFilter = 'all' | 'tv' | 'movies';

interface HeaderProps {
  onSearchPress?: () => void;
  onProfilePress?: () => void;
  onDebugPress?: () => void;
  activeFilter?: ContentFilter;
  onFilterChange?: (filter: ContentFilter) => void;
}

export const Header: React.FC<HeaderProps> = React.memo(
  ({
    onSearchPress,
    onProfilePress,
    onDebugPress,
    activeFilter = 'all',
    onFilterChange,
  }) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 10) }]}>
        {/* Top Brand & Actions Row */}
        <View style={styles.content}>
          {/* Velora Logo & Brand */}
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>V</Text>
            </View>
            <Text style={styles.brandName}>VELORA</Text>
          </View>

          {/* Action Icons */}
          <View style={styles.actionsRow}>
            {onDebugPress && (
              <Pressable
                onPress={onDebugPress}
                style={styles.iconButton}
                hitSlop={8}
                accessibilityLabel="Performance Diagnostics"
              >
                <Ionicons name="speedometer-outline" size={20} color={colors.textSecondary} />
              </Pressable>
            )}

            {onSearchPress && (
              <Pressable
                onPress={onSearchPress}
                style={styles.iconButton}
                hitSlop={8}
                accessibilityLabel="Search"
              >
                <Ionicons name="search" size={21} color={colors.textPrimary} />
              </Pressable>
            )}

            {onProfilePress && (
              <Pressable
                onPress={onProfilePress}
                style={styles.profileAvatar}
                hitSlop={8}
                accessibilityLabel="Profile"
              >
                <Avatar user={user} size={32} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Netflix-Style Content Filter Pills */}
        {onFilterChange && (
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => onFilterChange('all')}
              style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
              hitSlop={6}
            >
              <Text style={[styles.filterPillText, activeFilter === 'all' && styles.filterPillTextActive]}>
                All
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onFilterChange('tv')}
              style={[styles.filterPill, activeFilter === 'tv' && styles.filterPillActive]}
              hitSlop={6}
            >
              <Text style={[styles.filterPillText, activeFilter === 'tv' && styles.filterPillTextActive]}>
                TV Shows
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onFilterChange('movies')}
              style={[styles.filterPill, activeFilter === 'movies' && styles.filterPillActive]}
              hitSlop={6}
            >
              <Text style={[styles.filterPillText, activeFilter === 'movies' && styles.filterPillTextActive]}>
                Movies
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }
);

Header.displayName = 'Header';

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: colors.background,
  },
  content: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: metrics.screenHorizontalPadding,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  logoBadgeText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: -0.5,
  },
  brandName: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 2.2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
  },
  avatarInitial: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: metrics.screenHorizontalPadding,
    paddingBottom: 10,
    paddingTop: 2,
  },
  filterPill: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
});
