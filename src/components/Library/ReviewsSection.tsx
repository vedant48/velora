import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MediaType, Review, veloraApi } from '../../api/velora';
import { useAuth } from '../../state/AuthContext';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { AppLoader } from '../common/AppLoader';
import { ui } from '../../theme/ui';

interface ReviewsSectionProps {
  mediaType: MediaType;
  tmdbId: number;
  seasonNumber?: number;
}

/** Reviews list + composer (whole title when seasonNumber is 0/undefined). */
export const ReviewsSection = memo(function ReviewsSection({ mediaType, tmdbId, seasonNumber = 0 }: ReviewsSectionProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { user, apiReady } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(() => {
    if (!apiReady) {
      setLoading(false);
      return;
    }
    veloraApi
      .getReviews(mediaType, tmdbId, seasonNumber)
      .then(({ reviews }) => setReviews(reviews))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [apiReady, mediaType, tmdbId, seasonNumber]);

  useEffect(load, [load]);

  const post = useCallback(async () => {
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    try {
      await veloraApi.putReview(mediaType, tmdbId, { body, seasonNumber });
      setDraft('');
      load();
    } catch {
      // ignore; draft preserved
    } finally {
      setPosting(false);
    }
  }, [draft, posting, mediaType, tmdbId, seasonNumber, load]);

  if (!apiReady) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{seasonNumber > 0 ? `Season ${seasonNumber} reviews` : 'Reviews'}</Text>
      {user && (
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a review..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            maxLength={2000}
          />
          <Pressable onPress={post} style={[styles.postButton, (!draft.trim() || posting) && { opacity: 0.5 }]} disabled={!draft.trim() || posting}>
            {posting ? <AppLoader size="small" onAccent /> : <Ionicons name="send" size={16} color="#fff" />}
          </Pressable>
        </View>
      )}
      {loading ? (
        <AppLoader style={{ marginVertical: ui.space.md }} />
      ) : reviews.length === 0 ? (
        <Text style={styles.empty}>No reviews yet.</Text>
      ) : (
        reviews.map((r) => (
          <View key={r.id} style={styles.review}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewAuthor}>{r.display_name ?? r.username ?? 'User'}</Text>
              {r.rating !== null && (
                <View style={styles.reviewRating}>
                  <Ionicons name="star" size={11} color={colors.accentAmber} />
                  <Text style={styles.reviewRatingText}>{r.rating}/10</Text>
                </View>
              )}
            </View>
            {!!r.body && <Text style={styles.reviewBody}>{r.body}</Text>}
          </View>
        ))
      )}
    </View>
  );
});

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    marginTop: ui.space.xl,
    padding: ui.space.lg,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    gap: ui.space.md,
  },
  heading: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: ui.space.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: ui.space.md,
    paddingVertical: 9,
    color: colors.textPrimary,
    fontSize: 13,
  },
  postButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  empty: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  review: {
    gap: ui.space.xs,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  reviewRatingText: {
    fontSize: ui.type.label,
    fontWeight: '700',
    color: colors.accentAmber,
  },
  reviewBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textPrimary,
  },
});
