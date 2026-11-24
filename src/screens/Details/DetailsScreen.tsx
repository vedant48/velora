import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CachedImage as Image } from '../../experience/CachedImage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMovieCreditsQuery, useMovieDetailsQuery, useMovieVideosQuery, useSeasonEpisodesQuery, useSimilarMoviesQuery, useTVCreditsQuery, useTVDetailsQuery, useTVVideosQuery } from '../../api/queries';
import { getSeasonEpisodes } from '../../api/tv';
import { MediaItem } from '../../api/types';
import { veloraApi } from '../../api/velora';
import { WatchProviders } from '../../components/Details/WatchProviders';
import { EpisodeChecklist } from '../../components/Library/EpisodeChecklist';
import { ReviewsSection } from '../../components/Library/ReviewsSection';
import { TrackingControls } from '../../components/Library/TrackingControls';
import { MovieCarousel } from '../../components/MovieCarousel/MovieCarousel';
import { PersonModal } from '../../components/Person/PersonModal';
import { useLibraryItem } from '../../hooks/useLibraryItem';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../state/AuthContext';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { metrics } from '../../theme/metrics';
import { getImageUrl, IMAGE_CONFIG } from '../../utils/image';

type DetailsRouteProp = RouteProp<RootStackParamList, 'Details'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const DetailsScreen: React.FC = () => {
  const { colors, mode } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const route = useRoute<DetailsRouteProp>();
  const navigation = useNavigation<NavigationProp>();

  // Instant Display Data from route params (passed from card)
  const initialItem = route.params.item;
  const isMovie = initialItem.media_type === 'movie' || (!initialItem.media_type && !Boolean((initialItem as any).first_air_date));
  const isTV = !isMovie;

  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [isPersonModalVisible, setIsPersonModalVisible] = useState(false);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [titleStats, setTitleStats] = useState<{ want: number; watching: number; watched: number; reviews: number } | null>(null);
  const [mySeasonRatings, setMySeasonRatings] = useState<Record<number, number>>({});

  const { user, apiReady } = useAuth();

  // Background Queries for full details, cast credits, similar titles, and episodes
  const movieDetailsQuery = useMovieDetailsQuery(isMovie ? initialItem.id : 0);
  const movieCreditsQuery = useMovieCreditsQuery(isMovie ? initialItem.id : 0);
  const tvDetailsQuery = useTVDetailsQuery(isTV ? initialItem.id : 0);
  const tvCreditsQuery = useTVCreditsQuery(isTV ? initialItem.id : 0);
  const similarMoviesQuery = useSimilarMoviesQuery(initialItem.id);
  const seasonEpisodesQuery = useSeasonEpisodesQuery(isTV ? initialItem.id : 0, selectedSeason);
  const movieVideosQuery = useMovieVideosQuery(isMovie ? initialItem.id : 0);
  const tvVideosQuery = useTVVideosQuery(isTV ? initialItem.id : 0);

  // Merged Details
  const details = isMovie ? movieDetailsQuery.data : tvDetailsQuery.data;
  const credits = isMovie ? movieCreditsQuery.data : tvCreditsQuery.data;

  const title = (details as any)?.title || (details as any)?.name || initialItem.title;
  const overview = details?.overview || initialItem.overview;
  const posterUrl = getImageUrl(
    details?.poster_path || initialItem.poster_path || initialItem.backdrop_path,
    'poster'
  );

  const releaseDate =
    (details as any)?.release_date ||
    (details as any)?.first_air_date ||
    initialItem.release_date;

  // Items opened from the library carry no rating, so the loaded TMDB details are the source. This is TMDB's
  // community score, not IMDb's: Velora has no IMDb data source.
  const tmdbRating = Number((details as any)?.vote_average ?? initialItem.vote_average ?? 0) || 0;

  const totalEpisodes = isTV ? Number((details as any)?.number_of_episodes ?? 0) : 0;

  const lib = useLibraryItem({
    mediaType: isMovie ? 'movie' : 'tv',
    tmdbId: initialItem.id,
    title,
    posterPath: initialItem.poster_path,
    backdropPath: initialItem.backdrop_path,
    releaseDate,
    totalEpisodes,
  });

  // Aggregate platform counts for the stats row
  useEffect(() => {
    veloraApi
      .getTitleStats(isMovie ? 'movie' : 'tv', initialItem.id)
      .then(setTitleStats)
      .catch(() => undefined);
  }, [isMovie, initialItem.id, statsRefreshKey]);

  // My per-season ratings drive the star badge on season pills
  useEffect(() => {
    if (!isTV || !user || !apiReady) {
      setMySeasonRatings({});
      return;
    }
    let cancelled = false;
    veloraApi
      .me()
      .then((me) =>
        veloraApi.getReviews('tv', initialItem.id).then(({ reviews }) => {
          if (cancelled) return;
          const map: Record<number, number> = {};
          for (const r of reviews) {
            if (r.user_id === me.user.id && r.season_number > 0 && r.rating != null) {
              map[r.season_number] = r.rating;
            }
          }
          setMySeasonRatings(map);
        }),
      )
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isTV, user, apiReady, initialItem.id, statsRefreshKey]);

  const onChanged = useCallback(() => {
    setStatsRefreshKey((k) => k + 1);
    void lib.reload();
  }, [lib]);

  const episodes = useMemo(() => seasonEpisodesQuery.data ?? [], [seasonEpisodesQuery.data]);

  // Available seasons for TV shows
  const availableSeasons = useMemo(() => {
    const seasons = (details as any)?.seasons || [];
    const valid = seasons.filter((s: any) => s.season_number > 0);
    return valid.length > 0 ? valid : [{ id: 1, season_number: 1, name: 'Season 1' }];
  }, [details]);

  /**
   * Series-wide bulk actions for the top status-bar menu (user-confirmed
   * scope: whole series). The selected-season-only button lives at the end
   * of the episode list. Unwatch clears episode progress AND all of the
   * series' ratings/reviews, per-season and whole-series (season 0), since
   * the confirmed scope is the whole series (user: "hata do"). Move-to-Want
   * is a server-side fresh start (rating, reviews, progress cleared).
   */
  const markAllSeasons = useCallback(
    async (watched: boolean) => {
      const seasons = availableSeasons.map((s: any) => s.season_number as number);
      for (const sn of seasons) {
        let episodeNumbers: number[] = [];
        if (watched) {
          if (sn === selectedSeason) {
            episodeNumbers = episodes.map((e) => e.episode_number);
          } else {
            try {
              const eps = await getSeasonEpisodes(initialItem.id, sn);
              episodeNumbers = eps.map((e) => e.episode_number);
            } catch {
              continue;
            }
          }
        }
        await veloraApi.setSeasonWatched(initialItem.id, sn, {
          watched,
          episodes: episodeNumbers,
          title,
          posterPath: initialItem.poster_path,
          totalEpisodes,
        });
        if (!watched) {
          await veloraApi.deleteReview('tv', initialItem.id, sn).catch(() => undefined);
        }
      }
      if (!watched) {
        // Whole-series scope includes the series-level (season 0) review.
        await veloraApi.deleteReview('tv', initialItem.id, 0).catch(() => undefined);
      }
      setStatsRefreshKey((k) => k + 1);
      return true;
    },
    [availableSeasons, selectedSeason, episodes, initialItem.id, initialItem.poster_path, title, totalEpisodes],
  );

  // Trailer: official YouTube trailer/teaser if one exists (never implies in-app playback)
  const trailerUrl = useMemo(() => {
    const videos = (isMovie ? movieVideosQuery.data : tvVideosQuery.data) ?? [];
    const yt = videos.filter((v) => v.site === 'YouTube');
    const pick =
      yt.find((v) => v.type === 'Trailer' && v.official) ??
      yt.find((v) => v.type === 'Trailer') ??
      yt.find((v) => v.type === 'Teaser') ??
      yt[0];
    return pick ? `https://www.youtube.com/watch?v=${pick.key}` : null;
  }, [isMovie, movieVideosQuery.data, tvVideosQuery.data]);

  const openTrailer = useCallback(() => {
    if (trailerUrl) Linking.openURL(trailerUrl).catch(() => undefined);
  }, [trailerUrl]);

  const seasonYear = useMemo(() => {
    const first = episodes.find((e) => e.air_date)?.air_date;
    return first ? first.slice(0, 4) : undefined;
  }, [episodes]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSimilarItemPress = useCallback(
    (item: MediaItem) => {
      navigation.push('Details', { item });
    },
    [navigation]
  );

  const handlePersonPress = useCallback((personId: number) => {
    setSelectedPersonId(personId);
    setIsPersonModalVisible(true);
  }, []);

  const cast = useMemo(() => {
    return (credits?.cast || []).slice(0, 15);
  }, [credits]);

  const keyCrew = useMemo(() => {
    if (!credits?.crew) return [];
    const TARGET_ROLES = [
      'Director',
      'Writer',
      'Screenplay',
      'Producer',
      'Executive Producer',
      'Director of Photography',
      'Original Music Composer',
      'Creator',
    ];
    const seen = new Set<number>();
    const filtered: typeof credits.crew = [];
    for (const c of credits.crew) {
      if (TARGET_ROLES.includes(c.job) && !seen.has(c.id)) {
        seen.add(c.id);
        filtered.push(c);
      }
    }
    return filtered.slice(0, 12);
  }, [credits]);

  const airRange = useMemo(() => {
    if (!isTV || !details) return null;
    const first = (details as any).first_air_date;
    const last = (details as any).last_air_date;
    if (!first) return null;
    const fmt = (d: string) => {
      const [y, m, dd] = d.split('-');
      return `${dd}/${m}/${y}`;
    };
    return last && last !== first ? `${fmt(first)} - ${fmt(last)}` : fmt(first);
  }, [isTV, details]);

  const endedBadge = useMemo(() => {
    if (!isTV || !details) return null;
    const status = String((details as any).status ?? '');
    if (status === 'Ended') return 'has ended';
    if (status === 'Canceled') return 'canceled';
    if (status === 'Returning Series') return null;
    return null;
  }, [isTV, details]);

  const statusBadge = lib.status
    ? lib.status === 'want'
      ? 'Want'
      : lib.status === 'watching'
        ? 'Watching'
        : 'Watched'
    : null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* Opaque top bar: back + collapse. Content scrolls under it
          without showing through, and the scroll inset below keeps the
          first content clear of the buttons. */}
      <View
        style={[
          styles.floatingHeader,
          { paddingTop: Math.max(insets.top, 12) },
        ]}
      >
        <Pressable
          onPress={handleBack}
          style={styles.circleButton}
          hitSlop={8}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.textTertiary} />
        </Pressable>

        <Pressable
          onPress={handleBack}
          style={styles.circleButton}
          hitSlop={8}
          accessibilityLabel="Close details"
        >
          <Ionicons name="chevron-down" size={22} color={colors.textTertiary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 12) + 46 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Centered portrait poster with trailer play (Must reference) */}
        <View style={styles.posterSection}>
          <View style={styles.posterWrap}>
            <Image
              source={posterUrl ? { uri: posterUrl } : undefined}
              style={styles.poster}
              contentFit="cover"
              priority="high"
              transition={IMAGE_CONFIG.transition}
              cachePolicy={IMAGE_CONFIG.cachePolicy}
              placeholder={IMAGE_CONFIG.placeholder}
            />
            {trailerUrl && (
              <Pressable
                onPress={openTrailer}
                style={styles.playButton}
                accessibilityLabel="Play trailer on YouTube"
                accessibilityRole="button"
              >
                <Ionicons name="play" size={30} color="#FFF" style={{ marginLeft: 3 }} />
              </Pressable>
            )}
            {statusBadge && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{statusBadge}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.mainInfo}>
          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Date / air range + ended badge */}
          <View style={styles.dateRow}>
            {isMovie && releaseDate ? (
              <Text style={styles.dateText}>{formatDateLong(releaseDate)}</Text>
            ) : null}
            {isTV && airRange ? <Text style={styles.dateText}>{airRange}</Text> : null}
            {endedBadge ? (
              <View style={styles.endedPill}>
                <Text style={styles.endedPillText}>{endedBadge}</Text>
              </View>
            ) : null}
          </View>

          {/* Must-style tracking controls (pills / blue status bar + sheets) */}
          <TrackingControls
            mediaType={isMovie ? 'movie' : 'tv'}
            tmdbId={initialItem.id}
            title={title}
            posterPath={initialItem.poster_path}
            backdropPath={initialItem.backdrop_path}
            releaseDate={releaseDate}
            totalEpisodes={totalEpisodes}
            lib={lib}
            onChanged={onChanged}
            onMarkAllWatched={isTV ? () => markAllSeasons(true) : undefined}
            onMarkAllUnwatched={isTV ? () => markAllSeasons(false) : undefined}
          />

          {/* Stats row: rating + platform counts */}
          <View style={styles.statsRow}>
            {tmdbRating > 0 && (
              <View style={styles.statCell}>
                <Ionicons name="star" size={15} color={colors.accentAmber} />
                <Text style={styles.statValue}>{tmdbRating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>TMDB</Text>
              </View>
            )}
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{titleStats?.want ?? '-'}</Text>
              <Text style={styles.statLabel}>Want</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>
                {isMovie ? titleStats?.watched ?? '-' : titleStats?.watching ?? '-'}
              </Text>
              <Text style={styles.statLabel}>{isMovie ? 'Watched' : 'Watching'}</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{titleStats?.reviews ?? '-'}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
          </View>

          {/* Where to Watch (series: right under stats, per reference) */}
          <WatchProviders id={initialItem.id} isMovie={isMovie} />

          {/* Synopsis */}
          <Text style={styles.sectionHeading}>Overview</Text>
          <Text style={styles.overviewText}>
            {overview || 'No overview available for this title.'}
          </Text>

          {!!details?.genres?.length && <View style={styles.genreRow}>{details.genres.map(g => <View key={g.id} style={styles.genrePill}><Text style={styles.genreText}>{g.name}</Text></View>)}</View>}

          {/* Seasons & Episodes for TV Series */}
          {isTV && (
            <View style={styles.episodesSection}>
              <View style={styles.episodesHeader}>
                <Text style={styles.sectionHeading}>All episodes</Text>
                {totalEpisodes > 0 && (
                  <Text style={styles.episodesCountText}>{totalEpisodes}</Text>
                )}
              </View>

              {/* Season Selector Pills with rating badges */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.seasonsScroll}
              >
                {availableSeasons.map((s: any) => {
                  const isSelected = selectedSeason === s.season_number;
                  const rating = mySeasonRatings[s.season_number];
                  return (
                    <Pressable
                      key={s.id || s.season_number}
                      onPress={() => setSelectedSeason(s.season_number)}
                      style={[styles.seasonPill, isSelected && styles.seasonPillActive]}
                      hitSlop={6}
                    >
                      <Text style={[styles.seasonPillText, isSelected && styles.seasonPillTextActive]}>
                        {s.name || `Season ${s.season_number}`}
                      </Text>
                      {rating != null && (
                        <View style={styles.ratingBadge}>
                          <Ionicons name="star" size={10} color="#FFF" />
                          <Text style={styles.ratingBadgeText}>{rating}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <EpisodeChecklist
                seriesId={initialItem.id}
                title={title}
                posterPath={initialItem.poster_path}
                seasonNumber={selectedSeason}
                seasonYear={seasonYear}
                episodes={episodes}
                loadingEpisodes={seasonEpisodesQuery.isLoading}
                signedIn={Boolean(user) && apiReady}
                onChanged={onChanged}
                refreshKey={statsRefreshKey}
              />
            </View>
          )}

          {/* Cast Carousel */}
          {cast.length > 0 && (
            <View style={styles.castSection}>
              <Text style={styles.sectionHeading}>Top Cast</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.castScroll}
              >
                {cast.map((actor) => {
                  const profileUrl = getImageUrl(actor.profile_path, 'profile');
                  return (
                    <Pressable
                      key={actor.id}
                      onPress={() => handlePersonPress(actor.id)}
                      style={styles.castCard}
                      hitSlop={4}
                    >
                      <View style={styles.actorAvatar}>
                        {profileUrl ? (
                          <Image
                            source={{ uri: profileUrl }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                            transition={IMAGE_CONFIG.transition}
                            cachePolicy={IMAGE_CONFIG.cachePolicy}
                            placeholder={IMAGE_CONFIG.placeholder}
                          />
                        ) : (
                          <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={26} color={colors.textMuted} />
                          </View>
                        )}
                      </View>
                      <Text style={styles.actorName} numberOfLines={1}>
                        {actor.name}
                      </Text>
                      <Text style={styles.characterName} numberOfLines={1}>
                        {actor.character}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Key Crew Carousel */}
          {keyCrew.length > 0 && (
            <View style={styles.castSection}>
              <Text style={styles.sectionHeading}>Key Crew</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.castScroll}
              >
                {keyCrew.map((member) => {
                  const profileUrl = getImageUrl(member.profile_path, 'profile');
                  return (
                    <Pressable
                      key={`crew-${member.id}-${member.job}`}
                      onPress={() => handlePersonPress(member.id)}
                      style={styles.castCard}
                      hitSlop={4}
                    >
                      <View style={styles.actorAvatar}>
                        {profileUrl ? (
                          <Image
                            source={{ uri: profileUrl }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                            transition={IMAGE_CONFIG.transition}
                            cachePolicy={IMAGE_CONFIG.cachePolicy}
                            placeholder={IMAGE_CONFIG.placeholder}
                          />
                        ) : (
                          <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={26} color={colors.textMuted} />
                          </View>
                        )}
                      </View>
                      <Text style={styles.actorName} numberOfLines={1}>
                        {member.name}
                      </Text>
                      <Text style={styles.characterName} numberOfLines={1}>
                        {member.job}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Reviews (whole title) */}
          <ReviewsSection
            mediaType={isMovie ? 'movie' : 'tv'}
            tmdbId={initialItem.id}
            seasonNumber={0}
          />

          {/* Similar Titles Carousel */}
          {similarMoviesQuery.data && similarMoviesQuery.data.length > 0 && (
            <View style={styles.similarSection}>
              <MovieCarousel
                title="More Like This"
                data={similarMoviesQuery.data}
                onItemPress={handleSimilarItemPress}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Interactive Cast & Crew Person Profile Modal */}
      <PersonModal
        visible={isPersonModalVisible}
        personId={selectedPersonId}
        onClose={() => setIsPersonModalVisible(false)}
        onSelectMedia={(selected) => {
          setIsPersonModalVisible(false);
          navigation.push('Details', { item: selected });
        }}
      />
    </View>
  );
};

function formatDateLong(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genrePill: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surface, borderRadius: 18 },
  genreText: { color: colors.textSecondary, fontSize: 12 },
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: metrics.screenHorizontalPadding,
    paddingBottom: 8,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  posterSection: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: colors.background,
  },
  posterWrap: {
    width: 218,
    aspectRatio: 2 / 3,
    position: 'relative',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 10,
  },
  poster: {
    width: 218,
    aspectRatio: 2 / 3,
    borderRadius: 3,
    backgroundColor: colors.cardBackground,
  },
  playButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(30, 30, 36, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  statusBadge: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: 'rgba(14, 14, 20, 0.8)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  mainInfo: {
    marginTop: 24,
    paddingHorizontal: metrics.screenHorizontalPadding,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: -6,
  },
  dateText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '400',
  },
  endedPill: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  endedPillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  statCell: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
    marginBottom: 2,
  },
  overviewText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  castSection: {
    marginTop: 6,
  },
  castScroll: {
    paddingVertical: 8,
    gap: 12,
  },
  castCard: {
    width: 80,
    alignItems: 'center',
  },
  actorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceLight,
    overflow: 'hidden',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
  },
  actorName: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  characterName: {
    color: colors.textTertiary,
    fontSize: 10,
    textAlign: 'center',
    width: '100%',
  },
  similarSection: {
    marginHorizontal: -metrics.screenHorizontalPadding,
    marginTop: 6,
  },
  episodesSection: {
    marginTop: 14,
    marginBottom: 6,
  },
  episodesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  episodesCountText: {
    color: colors.textTertiary,
    fontSize: 13,
    fontWeight: '700',
  },
  seasonsScroll: {
    paddingVertical: 10,
    gap: 8,
  },
  seasonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  seasonPillActive: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.borderHighlight,
  },
  seasonPillText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  seasonPillTextActive: {
    color: colors.textPrimary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#55555F',
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  ratingBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
