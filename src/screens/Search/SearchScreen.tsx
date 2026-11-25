import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTrendingMoviesQuery } from '../../api/queries';
import { searchMovies, searchMulti, searchTV } from '../../api/search';
import { MediaItem } from '../../api/types';
import { veloraApi } from '../../api/velora';
import { AppLoader } from '../../components/common/AppLoader';
import { SearchPoster } from '../../components/Library/SearchPoster';
import { useDebounce } from '../../hooks/useDebounce';
import { RootStackParamList } from '../../navigation/types';
import { metrics } from '../../theme/metrics';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { Avatar } from '../../components/Avatar';
import { PosterGridSkeleton, PosterRowSkeleton, RowsSkeleton } from '../../components/Skeleton/ContentSkeletons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type FilterType = 'all' | 'movie' | 'tv' | 'people';

export const SearchScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const suggestions = useTrendingMoviesQuery();
  const navigation = useNavigation<NavigationProp>();

  const [inputQuery, setInputQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [allResults, setAllResults] = useState<MediaItem[]>([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // 350ms debounce prevents flooding TMDB proxy
  const debouncedQuery = useDebounce(inputQuery, 350);

  const searchScope = `${debouncedQuery}:${filter}`;
  const searchScopeRef = React.useRef(searchScope);
  searchScopeRef.current = searchScope;
  React.useEffect(() => { setIsFetchingMore(false); setPage(1); setHasMore(true); }, [searchScope]);

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
    enabled: filter !== 'people' && debouncedQuery.trim().length > 1,
    staleTime: 5 * 60 * 1000,
  });

  // Must-style quick action: find friends by username or display name
  const peopleQuery = useQuery({
    queryKey: ['userSearch', debouncedQuery],
    queryFn: () => veloraApi.searchUsers(debouncedQuery),
    enabled: filter === 'people' && debouncedQuery.trim().length > 1,
    staleTime: 60 * 1000,
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
  }, [data, searchScope]);

  // Lazy loading next pages on end reached (content comes in 3 columns)
  const handleLoadMore = useCallback(async () => {
    if (isFetchingMore || !hasMore || isLoading || debouncedQuery.trim().length <= 1) return;

    setIsFetchingMore(true);
    const nextPage = page + 1;
    const requestScope = searchScope;

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

      if (requestScope !== searchScopeRef.current) return;
      if (newItems && newItems.length > 0) {
        setAllResults((prev) => {
          const existingIds = new Set(prev.map((i) => `${i.media_type ?? 'movie'}:${i.id}`));
          const uniqueNew = newItems.filter((i) => !existingIds.has(`${i.media_type ?? 'movie'}:${i.id}`));
          return [...prev, ...uniqueNew];
        });
        setPage(nextPage);
        setHasMore(newItems.length >= 15);
      } else {
        setHasMore(false);
      }
    } catch {
      if (requestScope === searchScopeRef.current) setHasMore(false);
    } finally {
      if (requestScope === searchScopeRef.current) setIsFetchingMore(false);
    }
  }, [debouncedQuery, filter, hasMore, isFetchingMore, isLoading, page, searchScope]);

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
  const availableWidth = screenWidth - metrics.screenHorizontalPadding * 2;
  const gap = 10;
  const cardWidth = Math.floor((availableWidth - (numColumns - 1) * gap) / numColumns);
  const cardHeight = Math.floor(cardWidth * 1.5);

  const renderItem: ListRenderItem<MediaItem> = useCallback(
    ({ item }) => (
      <View style={{ marginBottom: gap }}>
        <SearchPoster
          item={item}
          onPress={handleItemPress}
          width={cardWidth}
        />
      </View>
    ),
    [cardWidth, cardHeight, handleItemPress]
  );

  const keyExtractor = useCallback((item: MediaItem) => `${item.media_type ?? 'movie'}:${item.id}`, []);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Search Header Input */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.navigate('MainTabs', { screen: 'ProfileTab' })} accessibilityRole="button" accessibilityLabel="Back to library" style={{ paddingVertical: 6, alignSelf: 'flex-start' }}><Ionicons name="arrow-back" size={20} color={colors.textSecondary} /></Pressable>
        {/* Apple redesign: iOS large title + filled rounded search field */}
        <Text style={styles.largeTitle}>Search</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Movies, series, people…"
            placeholderTextColor={colors.textMuted}
            value={inputQuery}
            onChangeText={setInputQuery}
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="never"
          />
          {inputQuery.length > 0 && (
            <Pressable accessibilityLabel="Clear search" accessibilityRole="button" onPress={handleClear} style={styles.clearButton} hitSlop={8}>
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
          <Pressable
            onPress={() => setFilter('people')}
            style={[styles.filterChip, filter === 'people' && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === 'people' && styles.filterChipTextActive]}>
              People
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content Area */}
      {filter === 'people' ? (
        debouncedQuery.trim().length <= 1 ? (
          <View style={styles.centerState}>
            <Ionicons name="people-outline" size={54} color={colors.textMuted} />
            <Text style={styles.stateTitle}>Find friends</Text>
            <Text style={styles.stateSubtitle}>Search Velora members by username or name.</Text>
          </View>
        ) : peopleQuery.isLoading ? (
          <RowsSkeleton />
        ) : peopleQuery.isError ? (
          <View style={styles.centerState}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
            <Text style={styles.stateTitle}>Search failed</Text>
            <Pressable onPress={() => peopleQuery.refetch()} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : (peopleQuery.data?.users.length ?? 0) === 0 ? (
          <View style={styles.centerState}>
            <Ionicons name="person-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.stateTitle}>No members found</Text>
            <Text style={styles.stateSubtitle}>Nobody matches "{debouncedQuery}" yet.</Text>
          </View>
        ) : (
          <FlashList
            data={peopleQuery.data?.users ?? []}
            keyExtractor={(u) => u.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item: u }) => (
              <Pressable style={styles.userRow} onPress={() => navigation.navigate('UserProfile', { username: u.username })}>
                <Avatar user={u} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.displayName}</Text>
                  <Text style={styles.userHandle}>@{u.username}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </Pressable>
            )}
          />
        )
      ) : (isLoading || (isFetching && allResults.length === 0)) && debouncedQuery.trim().length > 1 ? (
        <PosterGridSkeleton count={9} />
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
        <View style={styles.suggestions}>
          <Text style={styles.suggestedLabel}>Suggested</Text>
          {suggestions.isLoading ? <PosterRowSkeleton cardWidth={cardWidth} /> : suggestions.isError ?
            <Pressable onPress={() => suggestions.refetch()} accessibilityRole="button"><Text style={styles.stateSubtitle}>Could not load suggestions. Tap to retry.</Text></Pressable> :
            <View style={styles.suggestionsRow}>{suggestions.data?.slice(0, 3).map(item => <SearchPoster key={item.id} item={item} onPress={handleItemPress} width={cardWidth} labels={false} />)}</View>}
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
                <AppLoader style={{ paddingVertical: 24 }} />
              ) : null
            }
          />
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  suggestions: { paddingHorizontal: metrics.screenHorizontalPadding, gap: 20 },
  suggestedLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  suggestionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: metrics.screenHorizontalPadding,
    paddingBottom: 12,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: colors.appleText,
    marginTop: 2,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.appleFill,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
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
    backgroundColor: colors.appleFill,
  },
  filterChipActive: {
    backgroundColor: colors.surfaceLight,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.textPrimary,
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
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { fontSize: 17, fontWeight: '900', color: colors.primary },
  userName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  userHandle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
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

