import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MediaType, Review, veloraApi } from '../../api/velora';
import { useAuth } from '../../state/AuthContext';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { ui } from '../../theme/ui';
import { Avatar } from '../Avatar';

interface CircleReviewsProps {
  mediaType: MediaType;
  tmdbId: number;
  /** Changes when the user's own rating or review is saved; triggers a refetch. */
  refreshSignal?: string | number | null;
}

const author = (r: Review) => ({
  username: r.username ?? '',
  displayName: r.display_name ?? r.username ?? '',
  avatarAt: r.avatar_at ?? null,
});

/**
 * Review cards and a rating row for the signed-in user and the people they follow.
 * Movie: the title review and rating. Series: every written review, newest season
 * first (S3, S2, S1), and one rating per person: the last season that person rated.
 */
export const CircleReviews = memo(function CircleReviews({ mediaType, tmdbId, refreshSignal = null }: CircleReviewsProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { user, apiReady } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (!user || !apiReady) {
      setReviews([]);
      return;
    }
    let cancelled = false;
    veloraApi
      .getCircleReviews(mediaType, tmdbId)
      .then(({ reviews: list }) => {
        if (!cancelled) setReviews(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user, apiReady, mediaType, tmdbId, refreshSignal]);

  const cards = useMemo(() => {
    const written = reviews.filter((r) => !!r.body?.trim());
    const seasonRank = (r: Review) => (r.season_number === 0 ? -1 : r.season_number);
    return written.sort((a, b) => seasonRank(b) - seasonRank(a) || String(b.updated_at).localeCompare(String(a.updated_at)));
  }, [reviews]);

  const ratings = useMemo(() => {
    const byUser = new Map<string, Review>();
    for (const r of reviews) {
      if (r.rating == null) continue;
      const cur = byUser.get(r.user_id);
      // Last rated season wins; the whole-title rating (season 0) only counts when no season is rated.
      if (!cur || r.season_number > cur.season_number) byUser.set(r.user_id, r);
    }
    const mine = user?.id;
    return [...byUser.values()].sort(
      (a, b) => Number(b.user_id === mine) - Number(a.user_id === mine) || String(b.updated_at).localeCompare(String(a.updated_at)),
    );
  }, [reviews, user?.id]);

  if (cards.length === 0 && ratings.length === 0) return null;

  return (
    <View style={styles.root}>
      {cards.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsScroll}>
          {cards.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.headerRow}>
                <Avatar user={author(r)} size={52} />
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
                  {mediaType === 'tv' && r.season_number > 0 && <Text style={styles.seasonLabel}>Season {r.season_number}</Text>}
                </View>
              </View>
              <Text style={styles.body} numberOfLines={4}>
                {r.body}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
      {ratings.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ratingsScroll}>
          {ratings.map((r) => (
            <View key={r.user_id} style={styles.ratingItem}>
              <Avatar user={author(r)} size={62} />
              <View style={styles.badge}>
                <Ionicons name="star" size={9} color={colors.textSecondary} />
                <Text style={styles.badgeText}>{r.rating}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
});

const createStyles = (colors: AppColors) => StyleSheet.create({
  root: { marginTop: ui.space.lg, gap: ui.space.xl },
  cardsScroll: { gap: ui.space.md, paddingRight: ui.space.lg },
  card: {
    width: 300,
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    padding: ui.space.lg,
    gap: ui.space.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: ui.space.md },
  headerText: { flex: 1, gap: 3 },
  name: { color: colors.textPrimary, fontSize: ui.type.body, fontWeight: '700' },
  starsRow: { flexDirection: 'row', gap: 1 },
  seasonLabel: { color: colors.textSecondary, fontSize: ui.type.body, fontWeight: '700' },
  body: { color: colors.textSecondary, fontSize: ui.type.body, lineHeight: 20 },
  ratingsScroll: { gap: ui.space.md, paddingRight: ui.space.lg },
  ratingItem: { alignItems: 'center', paddingBottom: ui.space.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: -10,
    paddingHorizontal: ui.space.sm,
    paddingVertical: 2,
    borderRadius: ui.radius.pill,
    backgroundColor: colors.surfaceLight,
  },
  badgeText: { color: colors.textPrimary, fontSize: ui.type.label, fontWeight: '800' },
});
