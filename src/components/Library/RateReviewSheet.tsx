import { Ionicons } from '@expo/vector-icons';
import { CachedImage as Image } from '../../experience/CachedImage';
import { memo, useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { getImageUrl, IMAGE_CONFIG } from '../../utils/image';
import { AppLoader } from '../common/AppLoader';
import { BottomSheet } from '../common/BottomSheet';

const RATING_VALUES = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

interface RateReviewSheetProps {
  visible: boolean;
  title: string;
  /** e.g. "1999" for a movie or "Season 1 (1994)" for a season. */
  subtitle?: string;
  posterPath: string | null;
  initialRating?: number | null;
  initialBody?: string;
  saving?: boolean;
  onSave: (rating: number | null, body: string) => void;
  onClose: () => void;
}

/**
 * Must-style review + rating sheet: poster/title header, review box,
 * horizontal rating circles (X = no rating, then 10..1), share, full-width Save.
 * Rating is optional: X clears it.
 */
export const RateReviewSheet = memo(function RateReviewSheet({
  visible,
  title,
  subtitle,
  posterPath,
  initialRating = null,
  initialBody = '',
  saving = false,
  onSave,
  onClose,
}: RateReviewSheetProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [rating, setRating] = useState<number | null>(initialRating);
  const [body, setBody] = useState(initialBody);

  useEffect(() => {
    if (visible) {
      setRating(initialRating);
      setBody(initialBody);
    }
  }, [visible, initialRating, initialBody]);

  const posterUrl = getImageUrl(posterPath, 'poster');

  const share = () => {
    const parts = [title];
    if (subtitle) parts.push(subtitle);
    if (rating !== null) parts.push(`Rated ${rating}/10`);
    if (body.trim()) parts.push(body.trim());
    parts.push('Tracked on Velora');
    Share.share({ message: parts.join('\n') }).catch(() => undefined);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} showHandle>
          {/* Header: poster + title/subtitle */}
          <View style={styles.headerRow}>
            <View style={styles.posterWrap}>
              {posterUrl ? (
                <Image
                  source={{ uri: posterUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={IMAGE_CONFIG.transition}
                  cachePolicy={IMAGE_CONFIG.cachePolicy}
                  placeholder={IMAGE_CONFIG.placeholder}
                />
              ) : (
                <View style={styles.posterFallback}>
                  <Ionicons name="film-outline" size={20} color={colors.textMuted} />
                </View>
              )}
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {!!subtitle && (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Review input */}
          <TextInput
            style={styles.reviewInput}
            placeholder="Write your review..."
            placeholderTextColor={colors.textMuted}
            multiline
            value={body}
            onChangeText={setBody}
            maxLength={4000}
          />

          <View style={styles.divider} />

          {/* Rating row: emoji + X + 10..1 */}
          <View style={styles.ratingRow}>
            <Ionicons name="happy-outline" size={30} color={colors.textSecondary} style={styles.emoji} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ratingScroll}>
              <Pressable
                onPress={() => setRating(null)}
                style={[styles.circle, rating === null && styles.circleSelectedBlue]}
                accessibilityLabel="No rating"
                accessibilityState={{ selected: rating === null }}
              >
                <Ionicons name="close" size={18} color={rating === null ? '#FFF' : colors.textSecondary} />
              </Pressable>
              {RATING_VALUES.map((v) => {
                const selected = rating === v;
                return (
                  <Pressable
                    key={v}
                    onPress={() => setRating(v)}
                    style={[styles.circle, selected && styles.circleSelectedBlue]}
                    accessibilityLabel={`Rate ${v} out of 10`}
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.circleText, selected && styles.circleTextSelected]}>{v}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.divider} />

          {/* Share */}
          <Pressable onPress={share} style={styles.shareButton} accessibilityLabel="Share">
            <View style={styles.shareCircle}>
              <Ionicons name="arrow-redo" size={20} color={colors.textPrimary} />
            </View>
          </Pressable>

          {/* Save */}
          <Pressable
            onPress={() => onSave(rating, body.trim())}
            disabled={saving}
            style={({ pressed }) => [styles.saveButton, (pressed || saving) && { opacity: 0.75 }]}
            accessibilityRole="button" accessibilityLabel="Save review"
          >
            {saving ? <AppLoader onAccent /> : <Text style={styles.saveText}>Save</Text>}
          </Pressable>
    </BottomSheet>
  );
});

const createStyles = (colors: AppColors) => StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 12,
  },
  posterWrap: {
    width: 52,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLight,
  },
  posterFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.surfaceLight,
  },
  reviewInput: {
    minHeight: 96,
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 14,
  },
  emoji: { marginRight: 4 },
  ratingScroll: {
    gap: 10,
    paddingRight: 16,
    alignItems: 'center',
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleSelectedBlue: {
    backgroundColor: colors.trackBlue,
  },
  circleText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  circleTextSelected: { color: '#FFF' },
  shareButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  shareCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: colors.trackBlue,
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  saveText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
