import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { searchMulti, searchMovies, searchTV } from '../../api/search';
import { MediaItem } from '../../api/types';
import { MovieCard } from '../../components/MovieCard/MovieCard';
import { MovieCardSkeleton } from '../../components/Skeleton/MovieCardSkeleton';
import { useDebounce } from '../../hooks/useDebounce';
import { colors } from '../../theme/colors';
import { metrics } from '../../theme/metrics';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type FilterType = 'all' | 'movie' | 'tv';

export const SearchScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const [inputQuery, setInputQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [allResults, setAllResults] = useState<MediaItem[]>([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // 350ms debounce prevents flooding TMDB proxy
  const debouncedQuery = useDebounce(inputQuery, 350);

  // TanStack Query for initial page of debounced search
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['search', debouncedQuery, filter],
    queryFn: async ({ signal }) => {
      if (!debouncedQuery.trim()) return [];

      if (filter === 'movie') {
        const res = await searchMovies(debouncedQuery, 1, signal);
        return res.map((m) => ({
          ...m,
          media_type: 'movie' as const,
        }));
      } else if (filter === 'tv') {
        const res = await searchTV(debouncedQuery, 1, signal);
        return res.map((s) => ({
          id: s.id,
          media_type: 'tv' as const,
          title: s.name,
          overview: s.overview,
          poster_path: s.poster_path,
          backdrop_path: s.backdrop_path,
          vote_average: s.vote_average,
          release_date: s.first_air_date,
          genre_ids: s.genre_ids,
        }));
      } else {
        return searchMulti(debouncedQuery, 1, signal);
      }
    },
    enabled: debouncedQuery.trim().length > 1,
    staleTime: 5 * 60 * 1000,
  });

  // Sync initial query data into accumulated results array
  React.useEffect(() => {
    if (data) {
      setAllResults(data);
      setPage(1);
      setHasMore(data.length >= 18);
    } else {
      setAllResults([]);
    }
  }, [data]);

  // Lazy loading next pages on end reached (content comes in 3 columns)
  const handleLoadMore = useCallback(async () => {
    if (isFetchingMore || !hasMore || isLoading || debouncedQuery.trim().length <= 1) return;

    setIsFetchingMore(true);
    const nextPage = page + 1;

    try {
      let newItems: MediaItem[] = [];
      if (filter === 'movie') {
        const res = await searchMovies(debouncedQuery, nextPage);
        newItems = res.map((m) => ({ ...m, media_type: 'movie' as const }));
      } else if (filter === 'tv') {
        const res = await searchTV(debouncedQuery, nextPage);
        newItems = res.map((s) => ({
          id: s.id,
          media_type: 'tv' as const,
          title: s.name,
          overview: s.overview,
          poster_path: s.poster_path,
          backdrop_path: s.backdrop_path,
          vote_average: s.vote_average,
          release_date: s.first_air_date,
          genre_ids: s.genre_ids,
        }));
      } else {
        newItems = await searchMulti(debouncedQuery, nextPage);
      }

      if (newItems && newItems.length > 0) {
        setAllResults((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const uniqueNew = newItems.filter((i) => !existingIds.has(i.id));
          return [...prev, ...uniqueNew];
        });
        setPage(nextPage);
        setHasMore(newItems.length >= 15);
      } else {
        setHasMore(false);
      }
    } catch {
      setHasMore(false);
    } finally {
      setIsFetchingMore(false);
    }
  }, [debouncedQuery, filter, hasMore, isFetchingMore, isLoading, page]);

  const handleClear = useCallback(() => {
    setInputQuery('');
    setAllResults([]);
  }, []);

  const handleItemPress = useCallback(
    (item: MediaItem) => {
      navigation.navigate('Details', { item });
    },
    [navigation]
  );

  // Column calculation for 3-column grid
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
      {/* Search Header Input */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Search movies, TV shows, actors..."
            placeholderTextColor={colors.textMuted}
            value={inputQuery}
            onChangeText={setInputQuery}
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="never"
          />
          {inputQuery.length > 0 && (
            <Pressable onPress={handleClear} style={styles.clearButton} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setFilter('all')}
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
              All
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilter('movie')}
            style={[styles.filterChip, filter === 'movie' && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === 'movie' && styles.filterChipTextActive]}>
              Movies
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilter('tv')}
            style={[styles.filterChip, filter === 'tv' && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === 'tv' && styles.filterChipTextActive]}>
              TV Series
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content Area */}
      {(isLoading || (isFetching && allResults.length === 0)) && debouncedQuery.trim().length > 1 ? (
        /* 3 rows of 3 columns skeleton (9 cards total) */
        <View style={styles.skeletonContainer}>
          {[0, 1, 2].map((rowIdx) => (
            <View key={rowIdx} style={styles.skeletonRow}>
              {[0, 1, 2].map((colIdx) => (
                <View key={colIdx} style={{ width: cardWidth }}>
                  <MovieCardSkeleton width={cardWidth} height={cardHeight} hasMarginRight={false} />
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : isError && allResults.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.stateTitle}>Search failed</Text>
          <Text style={styles.stateSubtitle}>Please check your connection and try again.</Text>
          <Pressable onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : debouncedQuery.trim().length > 1 && allResults.length === 0 && !isLoading && !isFetching ? (
        <View style={styles.centerState}>
          <Ionicons name="film-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.stateTitle}>No results found</Text>
          <Text style={styles.stateSubtitle}>
            We couldn't find anything matching "{debouncedQuery}".
          </Text>
        </View>
      ) : debouncedQuery.trim().length <= 1 ? (
        <View style={styles.centerState}>
          <Ionicons name="search-outline" size={54} color={colors.textMuted} />
          <Text style={styles.stateTitle}>Explore Movies & Series</Text>
          <Text style={styles.stateSubtitle}>
            Type a title, genre, or keyword to start searching.
          </Text>
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <FlashList
            data={allResults}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            numColumns={numColumns}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isFetchingMore ? (
                <View style={styles.footerSkeletonRow}>
                  {[0, 1, 2].map((colIdx) => (
                    <View key={colIdx} style={{ width: cardWidth }}>
                      <MovieCardSkeleton width={cardWidth} height={cardHeight} hasMarginRight={false} />
                    </View>
                  ))}
                </View>
              ) : null
            }
          />
        </View>
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
    paddingHorizontal: metrics.screenHorizontalPadding,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  skeletonContainer: {
    paddingHorizontal: metrics.screenHorizontalPadding,
    marginTop: 10,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: metrics.screenHorizontalPadding,
    paddingBottom: 40,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  stateTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  stateSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  footerLoaderText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  footerSkeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
});

