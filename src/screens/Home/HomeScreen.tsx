import React, { useCallback, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { MediaItem } from '../../api/types';
import {
  useTrendingMoviesQuery,
  usePopularMoviesQuery,
  useTopRatedMoviesQuery,
  useNowPlayingMoviesQuery,
  usePopularTVQuery,
  useTopRatedTVQuery,
  useTrendingTVQuery,
  useGenreMoviesQuery,
  useCollectionQuery,
} from '../../api/queries';
import { useContinueWatching } from '../../hooks/useContinueWatching';
import { Header, ContentFilter } from '../../components/common/Header';
import { HeroCarousel } from '../../components/HeroCarousel/HeroCarousel';
import { MovieCarousel } from '../../components/MovieCarousel/MovieCarousel';
import { colors } from '../../theme/colors';
import { metrics } from '../../theme/metrics';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activeFilter, setActiveFilter] = React.useState<ContentFilter>('all');

  // TanStack Query Hooks with automatic caching
  const trendingQuery = useTrendingMoviesQuery();
  const trendingTVQuery = useTrendingTVQuery();
  const popularMoviesQuery = usePopularMoviesQuery();
  const topRatedMoviesQuery = useTopRatedMoviesQuery();
  const nowPlayingQuery = useNowPlayingMoviesQuery();
  const popularTVQuery = usePopularTVQuery();
  const topRatedTVQuery = useTopRatedTVQuery();
  const actionQuery = useGenreMoviesQuery(28); // Action
  const sciFiQuery = useGenreMoviesQuery(878); // Sci-Fi
  const marvelCollectionQuery = useCollectionQuery(86311); // The Avengers Collection

  const { continueWatchingItems } = useContinueWatching();

  // Navigation callback
  const handleItemPress = useCallback(
    (item: MediaItem) => {
      navigation.navigate('Details', { item });
    },
    [navigation]
  );

  const handleSearchPress = useCallback(() => {
    (navigation as any).navigate('MainTabs', { screen: 'SearchTab' });
  }, [navigation]);

  const handleProfilePress = useCallback(() => {
    (navigation as any).navigate('MainTabs', { screen: 'ProfileTab' });
  }, [navigation]);

  const handleDebugPress = useCallback(() => {
    (navigation as any).navigate('MainTabs', { screen: 'DebugTab' });
  }, [navigation]);

  // Pull to refresh without jarring re-render
  const isRefreshing = trendingQuery.isRefetching;
  const onRefresh = useCallback(() => {
    trendingQuery.refetch();
    popularMoviesQuery.refetch();
    topRatedMoviesQuery.refetch();
  }, [trendingQuery, popularMoviesQuery, topRatedMoviesQuery]);

  // Transform Continue Watching items into MediaItems
  const continueWatchingMedia: MediaItem[] = useMemo(() => {
    return continueWatchingItems.map((item) => ({
      id: item.movieId,
      title: item.title,
      overview: '',
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      vote_average: 8.5,
      media_type: item.media_type,
    }));
  }, [continueWatchingItems]);

  const continueWatchingProgressMap = useMemo(() => {
    const map: Record<number, { progress: number; duration: number }> = {};
    continueWatchingItems.forEach((cw) => {
      map[cw.movieId] = { progress: cw.progress, duration: cw.duration };
    });
    return map;
  }, [continueWatchingItems]);

  // Hero carousel dynamically adapts to active filter
  const heroItems = useMemo(() => {
    if (activeFilter === 'tv') {
      return (trendingTVQuery.data || []).slice(0, 5);
    }
    return (trendingQuery.data || []).slice(0, 5);
  }, [activeFilter, trendingQuery.data, trendingTVQuery.data]);

  const isHeroLoading =
    activeFilter === 'tv' ? trendingTVQuery.isLoading : trendingQuery.isLoading;

  // Filter Continue Watching based on tab
  const filteredContinueWatching = useMemo(() => {
    if (activeFilter === 'tv') {
      return continueWatchingMedia.filter((item) => item.media_type === 'tv');
    }
    if (activeFilter === 'movies') {
      return continueWatchingMedia.filter((item) => item.media_type !== 'tv');
    }
    return continueWatchingMedia;
  }, [activeFilter, continueWatchingMedia]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Floating Glass Header with Netflix-Style Filter Pills */}
      <Header
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onSearchPress={handleSearchPress}
        onProfilePress={handleProfilePress}
        onDebugPress={handleDebugPress}
      />

      {/* Primary Vertical Virtualized Scroll Container */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* 1. Dynamic Hero Carousel */}
        <HeroCarousel
          items={heroItems}
          isLoading={isHeroLoading}
          onItemPress={handleItemPress}
        />

        {/* 2. Continue Watching (Local Persistent Mock System) */}
        {filteredContinueWatching.length > 0 && (
          <MovieCarousel
            title="Continue Watching"
            subtitle="Pick up right where you left off"
            data={filteredContinueWatching}
            onItemPress={handleItemPress}
            progressMap={continueWatchingProgressMap}
            cardWidth={metrics.backdropWidth}
            cardHeight={metrics.backdropHeight}
          />
        )}

        {/* --- TV SHOWS FILTER FEED --- */}
        {activeFilter === 'tv' && (
          <>
            <MovieCarousel
              title="Top 10 TV Shows Today"
              subtitle="Most streamed series right now"
              data={(trendingTVQuery.data || []).slice(0, 10)}
              isLoading={trendingTVQuery.isLoading}
              isError={trendingTVQuery.isError}
              onRetry={trendingTVQuery.refetch}
              onItemPress={handleItemPress}
              showRank={true}
            />

            <MovieCarousel
              title="Popular TV Series"
              subtitle="Binge-worthy shows everyone loves"
              data={popularTVQuery.data}
              isLoading={popularTVQuery.isLoading}
              isError={popularTVQuery.isError}
              onRetry={popularTVQuery.refetch}
              onItemPress={handleItemPress}
            />

            <MovieCarousel
              title="Critically Acclaimed TV"
              subtitle="Highest rated television of all time"
              data={topRatedTVQuery.data}
              isLoading={topRatedTVQuery.isLoading}
              isError={topRatedTVQuery.isError}
              onRetry={topRatedTVQuery.refetch}
              onItemPress={handleItemPress}
            />
          </>
        )}

        {/* --- MOVIES FILTER FEED --- */}
        {activeFilter === 'movies' && (
          <>
            <MovieCarousel
              title="Top 10 Movies Today"
              subtitle="Most watched movies on Velora"
              data={(trendingQuery.data || []).slice(0, 10)}
              isLoading={trendingQuery.isLoading}
              isError={trendingQuery.isError}
              onRetry={trendingQuery.refetch}
              onItemPress={handleItemPress}
              showRank={true}
            />

            <MovieCarousel
              title="Popular Blockbusters"
              subtitle="Global cinema hits"
              data={popularMoviesQuery.data}
              isLoading={popularMoviesQuery.isLoading}
              isError={popularMoviesQuery.isError}
              onRetry={popularMoviesQuery.refetch}
              onItemPress={handleItemPress}
            />

            <MovieCarousel
              title="Now in Theaters"
              subtitle="Fresh off the cinema screen"
              data={nowPlayingQuery.data}
              isLoading={nowPlayingQuery.isLoading}
              isError={nowPlayingQuery.isError}
              onRetry={nowPlayingQuery.refetch}
              onItemPress={handleItemPress}
            />

            <MovieCarousel
              title="Critically Acclaimed Masterpieces"
              subtitle="Award winners and legendary films"
              data={topRatedMoviesQuery.data}
              isLoading={topRatedMoviesQuery.isLoading}
              isError={topRatedMoviesQuery.isError}
              onRetry={topRatedMoviesQuery.refetch}
              onItemPress={handleItemPress}
            />

            <MovieCarousel
              title="Adrenaline & Action"
              subtitle="High-octane excitement"
              data={actionQuery.data}
              isLoading={actionQuery.isLoading}
              isError={actionQuery.isError}
              onRetry={actionQuery.refetch}
              onItemPress={handleItemPress}
              onSeeAllPress={() =>
                navigation.navigate('Genre', {
                  genreId: 28,
                  genreName: 'Action & Adventure',
                  mediaType: 'movie',
                })
              }
            />

            <MovieCarousel
              title="Sci-Fi & Future Worlds"
              subtitle="Explore the beyond"
              data={sciFiQuery.data}
              isLoading={sciFiQuery.isLoading}
              isError={sciFiQuery.isError}
              onRetry={sciFiQuery.refetch}
              onItemPress={handleItemPress}
              onSeeAllPress={() =>
                navigation.navigate('Genre', {
                  genreId: 878,
                  genreName: 'Sci-Fi & Fantasy',
                  mediaType: 'movie',
                })
              }
            />

            {marvelCollectionQuery.data && marvelCollectionQuery.data.length > 0 && (
              <MovieCarousel
                title="The Avengers Saga"
                subtitle="Marvel Cinematic Universe"
                data={marvelCollectionQuery.data}
                isLoading={marvelCollectionQuery.isLoading}
                isError={marvelCollectionQuery.isError}
                onRetry={marvelCollectionQuery.refetch}
                onItemPress={handleItemPress}
              />
            )}
          </>
        )}

        {/* --- ALL FEED (BLENDED) --- */}
        {activeFilter === 'all' && (
          <>
            <MovieCarousel
              title="Top 10 Trending Today"
              subtitle="Most watched across Velora"
              data={(trendingQuery.data || []).slice(0, 10)}
              isLoading={trendingQuery.isLoading}
              isError={trendingQuery.isError}
              onRetry={trendingQuery.refetch}
              onItemPress={handleItemPress}
              showRank={true}
            />

            <MovieCarousel
              title="Popular Movies"
              subtitle="Blockbusters everyone is talking about"
              data={popularMoviesQuery.data}
              isLoading={popularMoviesQuery.isLoading}
              isError={popularMoviesQuery.isError}
              onRetry={popularMoviesQuery.refetch}
              onItemPress={handleItemPress}
            />

            <MovieCarousel
              title="Popular TV Shows"
              subtitle="Binge-worthy series"
              data={popularTVQuery.data}
              isLoading={popularTVQuery.isLoading}
              isError={popularTVQuery.isError}
              onRetry={popularTVQuery.refetch}
              onItemPress={handleItemPress}
            />

            <MovieCarousel
              title="Now in Theaters"
              subtitle="Fresh off the cinema screen"
              data={nowPlayingQuery.data}
              isLoading={nowPlayingQuery.isLoading}
              isError={nowPlayingQuery.isError}
              onRetry={nowPlayingQuery.refetch}
              onItemPress={handleItemPress}
            />

            <MovieCarousel
              title="Critically Acclaimed"
              subtitle="Highest rated of all time"
              data={topRatedMoviesQuery.data}
              isLoading={topRatedMoviesQuery.isLoading}
              isError={topRatedMoviesQuery.isError}
              onRetry={topRatedMoviesQuery.refetch}
              onItemPress={handleItemPress}
            />

            <MovieCarousel
              title="Top Rated TV Series"
              subtitle="Critically acclaimed television"
              data={topRatedTVQuery.data}
              isLoading={topRatedTVQuery.isLoading}
              isError={topRatedTVQuery.isError}
              onRetry={topRatedTVQuery.refetch}
              onItemPress={handleItemPress}
            />

            <MovieCarousel
              title="Adrenaline & Action"
              subtitle="High-octane excitement"
              data={actionQuery.data}
              isLoading={actionQuery.isLoading}
              isError={actionQuery.isError}
              onRetry={actionQuery.refetch}
              onItemPress={handleItemPress}
              onSeeAllPress={() =>
                navigation.navigate('Genre', {
                  genreId: 28,
                  genreName: 'Action & Adventure',
                  mediaType: 'movie',
                })
              }
            />

            <MovieCarousel
              title="Sci-Fi & Future Worlds"
              subtitle="Explore the beyond"
              data={sciFiQuery.data}
              isLoading={sciFiQuery.isLoading}
              isError={sciFiQuery.isError}
              onRetry={sciFiQuery.refetch}
              onItemPress={handleItemPress}
              onSeeAllPress={() =>
                navigation.navigate('Genre', {
                  genreId: 878,
                  genreName: 'Sci-Fi & Fantasy',
                  mediaType: 'movie',
                })
              }
            />

            {marvelCollectionQuery.data && marvelCollectionQuery.data.length > 0 && (
              <MovieCarousel
                title="The Avengers Saga"
                subtitle="Marvel Cinematic Universe"
                data={marvelCollectionQuery.data}
                isLoading={marvelCollectionQuery.isLoading}
                isError={marvelCollectionQuery.isError}
                onRetry={marvelCollectionQuery.refetch}
                onItemPress={handleItemPress}
              />
            )}
          </>
        )}

        {/* Bottom padding for tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 80,
  },
  bottomSpacer: {
    height: 40,
  },
});
