import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMovieRecommendationsQuery, useNowPlayingMoviesQuery, useStreamingMoviesQuery, useTrendingMoviesQuery, useTrendingTVQuery, useUpcomingMoviesQuery } from '../../api/queries';
import { MediaItem } from '../../api/types';
import { LibraryItem, veloraApi } from '../../api/velora';
import { TVCollections } from '../../components/Collections/TVCollections';
import { CollectionsRail } from '../../components/Collections/CollectionsRail';
import { TrailersRail } from '../../components/Home/TrailersRail';
import { WatchNextRail } from '../../components/Home/WatchNextRail';
import { MovieCarousel } from '../../components/MovieCarousel/MovieCarousel';
import { useAuth } from '../../state/AuthContext';
import { useAppTheme } from '../../theme/ThemeContext';

export function ExploreScreen({ kind }: { kind: 'movies' | 'tv' | 'all' }) {
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
  const openSeries = useCallback((item: LibraryItem) => open({ id: item.tmdb_id, media_type: item.media_type, title: item.title, overview: '', poster_path: item.poster_path, backdrop_path: item.backdrop_path, vote_average: 0 }), [open]);
  const collections = <CollectionsRail onPressCollection={(collectionId, collectionName) => navigation.navigate('Collection', { collectionId, collectionName })} />;
  const forYou = seed ? recommended : trending;
  const rail = (title: string, query: typeof trending) => <MovieCarousel title={title} data={query.data} isLoading={query.isLoading} isError={query.isError} onRetry={query.refetch} onItemPress={open} cardWidth={124} cardHeight={186} minimal trackingStatus={tracked} />;
  return <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
    <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 88 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={trending.isRefetching || television.isRefetching} onRefresh={() => { void trending.refetch(); void television.refetch(); void nowPlaying.refetch(); void upcoming.refetch(); void streaming.refetch(); if (seed) void recommended.refetch(); }} tintColor={colors.primary} />}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>{kind === 'tv' ? 'TV Shows' : kind === 'movies' ? 'Movies' : 'Explore All'}</Text>
      {kind !== 'tv' && <>
        {rail(seed ? 'For you' : 'Trending movies', forYou)}
        <TrailersRail items={nowPlaying.data ?? []} onItemPress={open} />
        {rail('Available for streaming', streaming)}
        {rail('In Theaters Now', nowPlaying)}
        {rail('Coming Soon', upcoming)}
      </>}
      {kind !== 'movies' && <>
        <WatchNextRail onPressItem={openSeries} showEmpty />
        <TVCollections />
        {rail('Trending TV shows', television)}
      </>}
      {kind !== 'tv' && collections}
    </ScrollView>
  </View>;
}
export const MoviesExploreScreen = () => <ExploreScreen kind="movies" />;
export const TVExploreScreen = () => <ExploreScreen kind="tv" />;
export const AllExploreScreen = () => <ExploreScreen kind="all" />;
const styles = StyleSheet.create({ title: { fontSize: 25, fontWeight: '700', marginHorizontal: 20, marginTop: 28, marginBottom: 12 } });
