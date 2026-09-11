import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { RootStackParamList } from '../../navigation/types';
import { MediaItem } from '../../api/types';
import { useGenreInfiniteQuery } from '../../api/queries';
import { MovieCard } from '../../components/MovieCard/MovieCard';
import { MovieCardSkeleton } from '../../components/Skeleton/MovieCardSkeleton';
import { colors } from '../../theme/colors';
import { metrics } from '../../theme/metrics';

type GenreRouteProp = RouteProp<RootStackParamList, 'Genre'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const GenreScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<GenreRouteProp>();
  const navigation = useNavigation<NavigationProp>();

  const { genreId, genreName, mediaType: initialMediaType = 'movie' } = route.params;
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>(initialMediaType);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useGenreInfiniteQuery(genreId, mediaType);

  // Flatten infinite query pages
  const items: MediaItem[] = useMemo(() => {
    if (!data?.pages) return [];
    const flat = data.pages.flat();
    const seen = new Set<number>();
    return flat.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [data]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleItemPress = useCallback(
    (item: MediaItem) => {
      navigation.push('Details', { item });
    },
    [navigation]
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  // 3-column grid calculation
  const numColumns = 3;
  const availableWidth = metrics.screenWidth - metrics.screenHorizontalPadding * 2;
  const gap = 10;
  const cardWidth = Math.floor((availableWidth - (numColumns - 1) * gap) / numColumns);
  const cardHeight = Math.floor(cardWidth * 1.5);

  const renderItem: ListRenderItem<MediaItem> = useCallback(
    ({ item }) => (
      <View style={{ marginBottom: gap }}>
        <MovieCard
          item={item}
          onPress={handleItemPress}
          width={cardWidth}
          height={cardHeight}
          hasMarginRight={false}
        />
      </View>
    ),
    [cardWidth, cardHeight, handleItemPress]
  );

  const keyExtractor = useCallback((item: MediaItem) => item.id.toString(), []);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={8}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {genreName}
          </Text>
        </View>

        {/* Media type toggle pills */}
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setMediaType('movie')}
            style={[styles.togglePill, mediaType === 'movie' && styles.togglePillActive]}
          >
            <Text
              style={[styles.toggleText, mediaType === 'movie' && styles.toggleTextActive]}
            >
              Movies
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMediaType('tv')}
            style={[styles.togglePill, mediaType === 'tv' && styles.togglePillActive]}
          >
            <Text
              style={[styles.toggleText, mediaType === 'tv' && styles.toggleTextActive]}
            >
              TV
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Grid Content */}
      {isLoading ? (
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 9 }).map((_, index) => (
            <View key={`genre-skeleton-${index}`} style={{ marginBottom: gap }}>
              <MovieCardSkeleton
                width={cardWidth}
                height={cardHeight}
                hasMarginRight={false}
              />
            </View>
          ))}
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="film-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Titles Found</Text>
          <Text style={styles.emptySubtitle}>
            We couldn't find any {mediaType === 'movie' ? 'movies' : 'TV shows'} in {genreName}.
          </Text>
        </View>
      ) : (
        <FlashList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={numColumns}
          contentContainerStyle={styles.listContent}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <View style={{ height: 40 }} />
            )
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: metrics.screenHorizontalPadding,
    paddingBottom: metrics.spacingMd,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: 18,
    padding: 3,
    gap: 4,
  },
  togglePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  togglePillActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  toggleTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: metrics.screenHorizontalPadding,
    paddingTop: metrics.spacingMd,
  },
  listContent: {
    paddingHorizontal: metrics.screenHorizontalPadding,
    paddingTop: metrics.spacingMd,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
