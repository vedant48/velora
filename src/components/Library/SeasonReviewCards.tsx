import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Review, veloraApi } from '../../api/velora';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { ui } from '../../theme/ui';

interface SeasonReviewCardsProps {
  seriesId: number;
  seasonNumber: number;
  /** Changes when the user's own season review is saved; triggers a refetch. */
  refreshSignal?: string | number | null;
}

/** Must-style horizontal season review cards under the episode list. */
export const SeasonReviewCards = memo(function SeasonReviewCards({
  seriesId,
  seasonNumber,
  refreshSignal = null,
}: SeasonReviewCardsProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    let cancelled = false;
    veloraApi
      .getReviews('tv', seriesId, seasonNumber)
      .then(({ reviews }) => {
        if (!cancelled) setReviews(reviews.filter((r) => r.rating != null || r.body));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [seriesId, seasonNumber, refreshSignal]);

  if (reviews.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      style={styles.root}
    >
      {reviews.map((r) => (
        <View key={r.id} style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(r.display_name?.[0] ?? r.username?.[0] ?? '?').toUpperCase()}
              </Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.name} numberOfLines={1}>
                {r.display_name || r.username || 'Velora user'}
              </Text>
              {r.rating != null && (
                <View style={styles.starsRow}>
                  {Array.from({ length: 10 }, (_, i) => (
                    <Ionicons
                      key={i}
                      name={i < (r.rating ?? 0) ? 'star' : 'star-outline'}
                      size={11}
                      color={i < (r.rating ?? 0) ? colors.textPrimary : colors.textMuted}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
          <Text style={styles.seasonLabel}>Season {r.season_number}</Text>
          {!!r.body && (
            <Text style={styles.body} numberOfLines={3}>
              {r.body}
            </Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
});

const createStyles = (colors: AppColors) => StyleSheet.create({
  root: { marginTop: 18 },
  scroll: { gap: ui.space.md, paddingRight: ui.space.lg },
  card: {
    width: 250,
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    padding: 14,
    gap: ui.space.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  headerText: { flex: 1, gap: 3 },
  name: {
    color: colors.textPrimary,
    fontSize: ui.type.body,
    fontWeight: '700',
  },
  starsRow: { flexDirection: 'row', gap: 1 },
  seasonLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
