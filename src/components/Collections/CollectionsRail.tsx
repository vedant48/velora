import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getCollection } from '../../api/movies';
import { veloraApi } from '../../api/velora';
import { useAuth } from '../../state/AuthContext';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { getImageUrl, IMAGE_CONFIG } from '../../utils/image';

/** Curated TMDB collections (user confirmed TMDB collections as the source). */
const COLLECTION_IDS = [
  86311, // The Avengers
  1241, // Harry Potter
  119, // The Lord of the Rings
  10, // Star Wars
  645, // James Bond
  9485, // Fast & Furious
  263, // The Dark Knight
  10194, // Toy Story
];

interface CollectionCard {
  id: number;
  name: string;
  poster_path: string | null;
  partIds: number[];
  watched: number | null;
}

interface CollectionsRailProps {
  onPressCollection: (collectionId: number, name: string) => void;
}

/**
 * Must-style Collections cards on Explore. Progress = how many of the
 * collection's movies the signed-in user has watched. (The reference's
 * "likes" count is omitted: no likes system exists.)
 */
export const CollectionsRail = memo(function CollectionsRail({ onPressCollection }: CollectionsRailProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { user, apiReady } = useAuth();
  const [collections, setCollections] = useState<CollectionCard[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        COLLECTION_IDS.map(async (id) => {
          try {
            const c = await getCollection(id);
            return {
              id: c.id,
              name: c.name,
              poster_path: c.poster_path,
              partIds: (c.parts || []).map((p) => p.id),
              watched: null,
            } as CollectionCard;
          } catch {
            return null;
          }
        }),
      );
      let cards = results.filter((c): c is CollectionCard => c !== null);

      if (user && apiReady && cards.length > 0) {
        try {
          const refs = [...new Set(cards.flatMap((c) => c.partIds))].map((tmdbId) => ({
            mediaType: 'movie' as const,
            tmdbId,
          }));
          const { states } = await veloraApi.lookup(refs.slice(0, 100));
          cards = cards.map((c) => ({
            ...c,
            watched: c.partIds.filter((id) => states[`movie:${id}`]?.status === 'watched').length,
          }));
        } catch {
          // progress stays 0
        }
      }
      if (!cancelled) setCollections(cards);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, apiReady]);

  if (collections.length === 0) return null;

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Collections · {collections.length}</Text>
      <View style={styles.scroll}>
        {collections.map((c) => {
          const poster = getImageUrl(c.poster_path, 'poster');
          const progress = c.partIds.length > 0 ? (c.watched ?? 0) / c.partIds.length : 0;
          return (
            <Pressable
              key={c.id}
              onPress={() => onPressCollection(c.id, c.name)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel={c.name}
            >
              <Ionicons name="film-outline" size={36} color={colors.textSecondary} />
              <Text style={styles.name} numberOfLines={2}>
                {c.name}
              </Text>
              <Text style={styles.progressText}>{user && c.watched !== null ? `${c.watched} of ${c.partIds.length}` : `${c.partIds.length} movies`}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const createStyles = (colors: AppColors) => StyleSheet.create({
  root: { marginTop: 18 },
  heading: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  scroll: { gap: 12, paddingHorizontal: 20 },
  card: { alignItems: 'center', justifyContent: 'center', minHeight: 164, padding: 20, borderRadius: 5, backgroundColor: colors.surface },
  posterWrap: {
    width: 130,
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLight,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  progressTrack: {
    flex: 1,
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.trackBlue,
    borderRadius: 2,
  },
  progressText: {
    color: colors.textTertiary,
    fontSize: 17,
    fontWeight: '600',
    marginTop: 4,
  },
});
