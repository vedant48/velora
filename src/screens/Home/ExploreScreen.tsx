import { LazySection, ViewportContext } from '../../experience/LazySection';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMovieRecommendationsQuery, useNowPlayingMoviesQuery, useStreamingMoviesQuery, useTrendingMoviesQuery, useTrendingTVQuery, useUpcomingMoviesQuery } from '../../api/queries';
import { MediaItem } from '../../api/types';
import { LibraryItem, veloraApi } from '../../api/velora';
import { TVCollections } from '../../components/Collections/TVCollections';
import { CollectionsRail } from '../../components/Collections/CollectionsRail';
import { HeroBanner } from '../../components/Home/HeroBanner';
import { WideCardRail } from '../../components/Home/WideCardRail';
import { TrailersRail } from '../../components/Home/TrailersRail';
import { WatchNextRail } from '../../components/Home/WatchNextRail';
import { MovieCarousel } from '../../components/MovieCarousel/MovieCarousel';
import { useAuth } from '../../state/AuthContext';
import { useAppTheme } from '../../theme/ThemeContext';

export function ExploreScreen({ kind }: { kind: 'movies' | 'tv' | 'all' }) {
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
  const [seed, setSeed] = useState(0);
  const [tracked, setTracked] = useState<Record<string, string>>({});
  const recommended = useMovieRecommendationsQuery(seed);
  useFocusEffect(useCallback(() => {
    let active = true;
    setSeed(0); setTracked({});
    if (user && apiReady) veloraApi.getLibrary().then(({ items }) => {
      if (!active) return;
      const watched = items.filter(i => i.media_type === 'movie' && i.status === 'watched');
      setSeed(watched.find(i => (i.rating ?? 0) >= 7)?.tmdb_id ?? watched[0]?.tmdb_id ?? 0);
      setTracked(Object.fromEntries(items.map(i => [`${i.media_type}:${i.tmdb_id}`, i.status])));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [user?.username, apiReady]));
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
  const collections = <CollectionsRail onPressCollection={(collectionId, collectionName) => navigation.navigate('Collection', { collectionId, collectionName })} />;
  const forYou = seed ? recommended : trending;
  const heroItem = kind === 'tv' ? television.data?.[0] : forYou.data?.[0];
  const rail = (title: string, query: typeof trending) => <MovieCarousel title={title} data={query.data} isLoading={query.isLoading} isError={query.isError} onRetry={query.refetch} onItemPress={open} cardWidth={116} cardHeight={174} minimal trackingStatus={tracked} />;
  return <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
    <ViewportContext.Provider value={{ offset, height: viewportHeight }}><ScrollView onScroll={e => setOffset(Math.floor(e.nativeEvent.contentOffset.y / 160) * 160)} scrollEventThrottle={100} contentContainerStyle={{ paddingBottom: insets.bottom + 88 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={trending.isRefetching || television.isRefetching} onRefresh={() => { void trending.refetch(); void television.refetch(); void nowPlaying.refetch(); void upcoming.refetch(); void streaming.refetch(); if (seed) void recommended.refetch(); }} tintColor={colors.textPrimary} colors={[colors.textPrimary]} progressBackgroundColor={colors.appleCard} />}>
      {/* Gallery: only the explore-all mock carries a (centered) screen title; the movies/tv
          mocks open flush on the hero. The mock's sparkle affordance has no real feature, so it
          is intentionally absent. */}
      {kind === 'all' && <Text accessibilityRole="header" style={[styles.centeredTitle, { color: colors.appleText }]}>Explore</Text>}
      {heroItem && (
        <HeroBanner
          item={heroItem}
          eyebrow={kind === 'tv' ? 'Series pick for you' : kind === 'all' ? 'Featured' : 'Trending now'}
          tracked={tracked[`${heroItem.media_type ?? 'movie'}:${heroItem.id}`]}
          onDetails={open}
          onWant={addToWant}
        />
      )}
      {kind !== 'tv' && <>
        {kind === 'all' ? (
          <LazySection height={240}><WideCardRail title="Trending this week" items={trending.data ?? []} onItemPress={open} /></LazySection>
        ) : (
          <LazySection>{rail(seed ? 'For you' : 'Trending movies', forYou)}</LazySection>
        )}
        <LazySection height={230}><TrailersRail items={nowPlaying.data ?? []} onItemPress={open} /></LazySection>
        <LazySection>{rail('Available for streaming', streaming)}</LazySection>
        <LazySection>{rail('In Theaters Now', nowPlaying)}</LazySection>
        <LazySection>{rail('Coming Soon', upcoming)}</LazySection>
      </>}
      {kind !== 'movies' && <>
        <LazySection height={340}><WatchNextRail onPressItem={openSeries} showEmpty /></LazySection>
        <LazySection height={750}><TVCollections /></LazySection>
        <LazySection>{rail('Trending TV shows', television)}</LazySection>
      </>}
      {kind !== 'tv' && <LazySection height={700}>{collections}</LazySection>}
    </ScrollView></ViewportContext.Provider>
  </View>;
}
export const MoviesExploreScreen = () => <ExploreScreen kind="movies" />;
export const TVExploreScreen = () => <ExploreScreen kind="tv" />;
export const AllExploreScreen = () => <ExploreScreen kind="all" />;
const styles = StyleSheet.create({ centeredTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 10 } });
