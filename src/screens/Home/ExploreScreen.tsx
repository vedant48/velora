import { LazySection, ViewportContext } from '../../experience/LazySection';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNowPlayingMoviesQuery, useStreamingMoviesQuery, useTrendingMoviesQuery, useTrendingTVQuery, useUpcomingMoviesQuery } from '../../api/queries';
import { buildForYouRails, ForYouResult } from '../../api/forYou';
import { MediaItem } from '../../api/types';
import { LibraryItem, veloraApi } from '../../api/velora';
import { TVCollections } from '../../components/Collections/TVCollections';
import { CollectionsRail } from '../../components/Collections/CollectionsRail';
import { HeroBanner } from '../../components/Home/HeroBanner';
import { TrailersRail } from '../../components/Home/TrailersRail';
import { WatchNextRail } from '../../components/Home/WatchNextRail';
import { WideCardRail } from '../../components/Home/WideCardRail';
import { GenreBrowseSection } from '../../components/Home/GenreBrowseSection';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { MovieCarousel } from '../../components/MovieCarousel/MovieCarousel';
import { useAuth } from '../../state/AuthContext';
import { useAppTheme } from '../../theme/ThemeContext';
import { ui } from '../../theme/ui';

type ExploreFilter = 'all' | 'movies' | 'tv';

const FILTER_OPTIONS: { key: ExploreFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'movies', label: 'Movies' },
  { key: 'tv', label: 'Series' },
];

const EMPTY_FOR_YOU: ForYouResult = { mixed: [], rails: [] };

type RailSource = { data?: MediaItem[]; isLoading?: boolean; isError?: boolean; refetch?: () => void };

/** Single Explore tab: one discovery feed with an All / Movies / Series filter,
 *  personal multi-seed recommendations, genre browsing, then the catalog rails. */
export function ExploreScreen() {
  const [filter, setFilter] = useState<ExploreFilter>('all');
  const [offset, setOffset] = useState(0);
  const { height: viewportHeight } = useWindowDimensions();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, apiReady } = useAuth();
  const trending = useTrendingMoviesQuery();
  const television = useTrendingTVQuery();
  const nowPlaying = useNowPlayingMoviesQuery();
  const upcoming = useUpcomingMoviesQuery();
  const streaming = useStreamingMoviesQuery();
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [tracked, setTracked] = useState<Record<string, string>>({});
  const [rotation, setRotation] = useState(0);
  const [forYou, setForYou] = useState<ForYouResult>(EMPTY_FOR_YOU);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (user && apiReady) {
      veloraApi.getLibrary().then(({ items }) => {
        if (!active) return;
        setLibrary(items);
        setTracked(Object.fromEntries(items.map(i => [`${i.media_type}:${i.tmdb_id}`, i.status])));
      }).catch(() => undefined);
    } else {
      setLibrary([]);
      setTracked({});
    }
    return () => { active = false; };
  }, [user?.username, apiReady]));

  useEffect(() => {
    let active = true;
    if (library.length === 0) {
      setForYou(EMPTY_FOR_YOU);
      return;
    }
    buildForYouRails({ library, tracked, filter, rotation })
      .then(result => { if (active) setForYou(result); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [library, tracked, filter, rotation]);

  const open = useCallback((item: MediaItem) => navigation.navigate('Details', { item }), [navigation]);
  // Apple redesign hero: Want adds straight to the library (same upsert the details page uses).
  const addToWant = useCallback(async (item: MediaItem) => {
    if (!user || !apiReady) { navigation.navigate('Auth'); return; }
    const mediaType = (item.media_type ?? 'movie') as 'movie' | 'tv';
    try {
      await veloraApi.upsertItem({ mediaType, tmdbId: item.id, title: item.title, posterPath: item.poster_path, backdropPath: item.backdrop_path, releaseDate: item.release_date ?? null, status: 'want' });
      setTracked(prev => ({ ...prev, [`${mediaType}:${item.id}`]: 'want' }));
    } catch { /* failed add stays untracked; retry from the details page */ }
  }, [user, apiReady, navigation]);
  const openSeries = useCallback((item: LibraryItem) => open({ id: item.tmdb_id, media_type: item.media_type, title: item.title, overview: '', poster_path: item.poster_path, backdrop_path: item.backdrop_path, vote_average: 0 }), [open]);
  const openGenre = useCallback((genreId: number, genreName: string, mediaType: 'movie' | 'tv') => navigation.navigate('Genre', { genreId, genreName, mediaType }), [navigation]);
  const collections = <CollectionsRail onPressCollection={(collectionId, collectionName) => navigation.navigate('Collection', { collectionId, collectionName })} />;

  const heroItem = filter === 'tv' ? television.data?.[0] : (forYou.mixed[0] ?? trending.data?.[0]);
  const heroEyebrow = filter === 'tv' ? 'Series pick for you' : forYou.mixed.length > 0 ? 'Picked for you' : 'Trending now';

  const rail = (title: string, source: RailSource) => (
    <MovieCarousel title={title} data={source.data} isLoading={source.isLoading ?? false} isError={source.isError ?? false} onRetry={source.refetch ?? (() => undefined)} onItemPress={open} cardWidth={116} cardHeight={174} minimal trackingStatus={tracked} />
  );

  const onRefresh = useCallback(() => {
    void trending.refetch();
    void television.refetch();
    void nowPlaying.refetch();
    void upcoming.refetch();
    void streaming.refetch();
    // Rotate the recommendation seeds so the refresh surfaces new picks.
    setRotation(r => r + 1);
    if (user && apiReady) {
      veloraApi.getLibrary().then(({ items }) => {
        setLibrary(items);
        setTracked(Object.fromEntries(items.map(i => [`${i.media_type}:${i.tmdb_id}`, i.status])));
      }).catch(() => undefined);
    }
  }, [user, apiReady]);

  return <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
    <ViewportContext.Provider value={{ offset, height: viewportHeight }}><ScrollView onScroll={e => setOffset(Math.floor(e.nativeEvent.contentOffset.y / 160) * 160)} scrollEventThrottle={100} contentContainerStyle={{ paddingBottom: insets.bottom + 88 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={trending.isRefetching || television.isRefetching} onRefresh={onRefresh} tintColor={colors.textPrimary} colors={[colors.textPrimary]} progressBackgroundColor={colors.appleCard} />}>
      <Text accessibilityRole="header" style={[styles.centeredTitle, { color: colors.appleText }]}>Explore</Text>
      <View style={styles.filterWrap}>
        <SegmentedControl options={FILTER_OPTIONS} value={filter} onChange={setFilter} testIDPrefix="explore-filter" />
      </View>
      {heroItem && (
        <HeroBanner
          item={heroItem}
          eyebrow={heroEyebrow}
          tracked={tracked[`${heroItem.media_type ?? 'movie'}:${heroItem.id}`]}
          onDetails={open}
          onWant={addToWant}
        />
      )}
      {forYou.mixed.length > 0 && <LazySection>{rail('For you', { data: forYou.mixed })}</LazySection>}
      {forYou.rails.map(r => <LazySection key={r.key}>{rail(r.title, { data: r.items })}</LazySection>)}
      {filter !== 'tv' && <LazySection>{rail('Trending movies', trending)}</LazySection>}
      {filter !== 'movies' && <LazySection>{rail('Trending series', television)}</LazySection>}
      {filter !== 'movies' && <LazySection height={340}><WatchNextRail onPressItem={openSeries} showEmpty={filter !== 'all'} /></LazySection>}
      <LazySection height={filter === 'all' ? 560 : 330}><GenreBrowseSection filter={filter} onPressGenre={openGenre} /></LazySection>
      {filter !== 'tv' && <>
        {/* Trending movies/series rails also sit right after For you above; the
            wide Trending this week cards below keep the original All-tab section. */}
        {filter === 'all' && (
          <LazySection height={240}><WideCardRail title="Trending this week" items={trending.data ?? []} onItemPress={open} /></LazySection>
        )}
        <LazySection height={230}><TrailersRail items={nowPlaying.data ?? []} onItemPress={open} /></LazySection>
        <LazySection>{rail('Available for streaming', streaming)}</LazySection>
        <LazySection>{rail('In Theaters Now', nowPlaying)}</LazySection>
        <LazySection>{rail('Coming Soon', upcoming)}</LazySection>
        <LazySection height={700}>{collections}</LazySection>
      </>}
      {filter !== 'movies' && <>
        <LazySection height={750}><TVCollections /></LazySection>
      </>}
    </ScrollView></ViewportContext.Provider>
  </View>;
}

const styles = StyleSheet.create({
  centeredTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  filterWrap: { paddingHorizontal: ui.purpose.screenHorizontalPadding, marginBottom: ui.space.sm },
});
