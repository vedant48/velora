import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CachedImage as Image } from '../../experience/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Share, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMovieCreditsQuery, useMovieDetailsQuery, useMovieVideosQuery, useSeasonEpisodesQuery, useSimilarMoviesQuery, useTVCreditsQuery, useTVDetailsQuery, useTVVideosQuery } from '../../api/queries';
import { useQueryClient } from '@tanstack/react-query';
import { getSeasonEpisodes } from '../../api/tv';
import { MediaItem } from '../../api/types';
import { veloraApi } from '../../api/velora';
import { WatchProviders } from '../../components/Details/WatchProviders';
import { EpisodeChecklist } from '../../components/Library/EpisodeChecklist';
import { CircleReviews } from '../../components/Library/CircleReviews';
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
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const route = useRoute<DetailsRouteProp>();
  const navigation = useNavigation<NavigationProp>();

  // Instant Display Data from route params (passed from card)
  const initialItem = route.params.item;
  const isMovie = initialItem.media_type === 'movie' || (!initialItem.media_type && !Boolean((initialItem as any).first_air_date));
  const isTV = !isMovie;

  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonPickerOpen, setSeasonPickerOpen] = useState(false);
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
      // Watch state changed on the server: no consumer may serve the old progress.
      queryClient.invalidateQueries({ queryKey: ['epProgress', initialItem.id] });
      setStatsRefreshKey((k) => k + 1);
      return true;
    },
    [availableSeasons, selectedSeason, episodes, initialItem.id, initialItem.poster_path, title, totalEpisodes, queryClient],
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

  // Owner rule (25 Nov): cast and crew are one merged section; from the crew only directors
  // stay, shown before the cast.
  const directors = useMemo(() => {
    if (!credits?.crew) return [];
    const seen = new Set<number>();
    const filtered: typeof credits.crew = [];
    for (const c of credits.crew) {
      if (c.job === 'Director' && !seen.has(c.id)) {
        seen.add(c.id);
        filtered.push(c);
      }
    }
    return filtered.slice(0, 10);
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


  // Apple redesign: backdrop hero + grouped stats card (approved gallery direction)
  const backdropUrl = getImageUrl(
    (details as any)?.backdrop_path || initialItem.backdrop_path || null,
    'backdrop'
  );
  const year = releaseDate ? String(releaseDate).slice(0, 4) : '';
  const runtimeMinutes =
    Number((details as any)?.runtime ?? (details as any)?.episode_run_time?.[0] ?? 0) || 0;
  const runtimeText =
    runtimeMinutes > 0 ? `${Math.floor(runtimeMinutes / 60)}h ${runtimeMinutes % 60}m` : '';
  // Content rating from the enriched details query. IN is shown plain; a fallback
  // region's rating is labeled with its country code, never presented as the
  // viewer's own region and never invented.
  const certification = useMemo(() => {
    if (!details) return null;
    let value: string | null = null;
    let cc = 'IN';
    if (isMovie) {
      const results = (details as any).release_dates?.results ?? [];
      const pick = (code: string) =>
        results
          .find((r: any) => r.iso_3166_1 === code)
          ?.release_dates?.map((d: any) => String(d.certification ?? '').trim())
          .find(Boolean) ?? null;
      value = pick('IN');
      if (!value) { value = pick('US'); cc = 'US'; }
    } else {
      const results = (details as any).content_ratings?.results ?? [];
      const pick = (code: string) => results.find((r: any) => r.iso_3166_1 === code)?.rating ?? null;
      value = pick('IN');
      if (!value) { value = pick('US'); cc = 'US'; }
    }
    return value ? (cc === 'IN' ? value : `${value} (${cc})`) : null;
  }, [details, isMovie]);
  // User-triggered share via the native sheet; shares the title and its TMDB page, nothing else.
  const shareTitle = useCallback(() => {
    const kind = isMovie ? 'movie' : 'tv';
    const tmdbId = (details as any)?.id ?? initialItem.id;
    Share.share({ message: `${title} on Velora - https://www.themoviedb.org/${kind}/${tmdbId}` }).catch(() => undefined);
  }, [details, initialItem.id, isMovie, title]);

  const metaLine = [isMovie ? year : airRange ?? '', runtimeText, certification]
    .filter(Boolean)
    .join(' · ');
  const genresText = (details?.genres ?? []).map((g) => g.name).join(' · ');
  const statCells: { value: string; label: string; accent?: boolean }[] = [
    ...(tmdbRating > 0 ? [{ value: tmdbRating.toFixed(1), label: 'TMDB', accent: true }] : []),
    { value: String(titleStats?.want ?? '-'), label: 'Want' },
    {
      value: String(isMovie ? titleStats?.watched ?? '-' : titleStats?.watching ?? '-'),
      label: isMovie ? 'Watched' : 'Watching',
    },
    { value: String(titleStats?.reviews ?? '-'), label: 'Reviews' },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* Floating back + collapse circles over the hero (approved mock). */}
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
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </Pressable>

        <Pressable
          onPress={shareTitle}
          style={styles.circleButton}
          hitSlop={8}
          accessibilityLabel={`Share ${title}`}
          accessibilityRole="button"
        >
          <Ionicons name="share-outline" size={20} color="#FFF" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Apple redesign: full-bleed backdrop hero fading into the page */}
        <View style={styles.hero}>
          {backdropUrl ? (
            <Image
              source={{ uri: backdropUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              priority="high"
              transition={IMAGE_CONFIG.transition}
              cachePolicy={IMAGE_CONFIG.cachePolicy}
              placeholder={IMAGE_CONFIG.placeholder}
            />
          ) : null}
          <LinearGradient
            colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.45)', colors.background]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        </View>

        {/* Content Section */}
        <View style={styles.mainInfo}>
          {/* Poster + title/meta overlapping the hero bottom (approved mock detailhead) */}
          <View style={styles.detailHead}>
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
                  <Ionicons name="play" size={16} color="#FFF" style={{ marginLeft: 2 }} />
                </Pressable>
              )}
            </View>
            <View style={styles.detailTitleCol}>
              <Text style={styles.title}>{title}</Text>
              {metaLine ? <Text style={styles.metaLineText}>{metaLine}</Text> : null}
              {genresText ? (
                <View style={styles.genresRow}>
                  {(details?.genres ?? []).map((g, i) => (
                    <Pressable
                      key={g.id}
                      onPress={() => navigation.push('Genre', { genreId: g.id, genreName: g.name, mediaType: isMovie ? 'movie' : 'tv' })}
                      accessibilityRole="link"
                      accessibilityLabel={`${g.name} genre`}
                      hitSlop={4}
                    >
                      <Text style={styles.genresLineText}>
                        {g.name}{i < (details?.genres?.length ?? 0) - 1 ? ' · ' : ''}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {endedBadge ? (
                <View style={styles.endedPill}>
                  <Text style={styles.endedPillText}>{endedBadge}</Text>
                </View>
              ) : null}
            </View>
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

          {/* Apple redesign: grouped stats card (real TMDB + platform counts) */}
          <View style={styles.statsRow}>
            {statCells.map((cell, i) => (
              <View key={cell.label} style={[styles.statCell, i > 0 && styles.statCellDivider]}>
                {cell.accent ? (
                  <View style={styles.statValueRow}>
                    <Ionicons name="star" size={13} color="#FF9F0A" />
                    <Text style={[styles.statValue, styles.statValueAccent]}>{cell.value}</Text>
                  </View>
                ) : (
                  <Text style={styles.statValue}>{cell.value}</Text>
                )}
                <Text style={styles.statLabel}>{cell.label}</Text>
              </View>
            ))}
          </View>

          {/* Where to Watch (series: right under stats, per reference) */}
          <WatchProviders id={initialItem.id} isMovie={isMovie} />

          {/* Reviews and ratings from me and the people I follow */}
          <CircleReviews mediaType={isMovie ? 'movie' : 'tv'} tmdbId={initialItem.id} refreshSignal={`${lib.item?.updated_at ?? ""}-${statsRefreshKey}`} />

          {/* Synopsis */}
          <Text style={styles.sectionHeading}>Overview</Text>
          <Text style={styles.overviewText}>
            {overview || 'No overview available for this title.'}
          </Text>

          {/* Seasons & Episodes for TV Series */}
          {isTV && (
            <View style={styles.episodesSection}>
              <View style={styles.episodesHeader}>
                <Text style={styles.sectionHeading}>All episodes</Text>
                {totalEpisodes > 0 && (
                  <Text style={styles.episodesCountText}>{totalEpisodes}</Text>
                )}
              </View>

              {/* Apple redesign: season menu (mock single row) opening a picker sheet;
                  per-season star ratings are preserved on the picker rows. */}
              {(() => {
                const current = availableSeasons.find((s: any) => s.season_number === selectedSeason);
                const currentRating = mySeasonRatings[selectedSeason];
                return (
                  <Pressable
                    testID="season-menu"
                    style={styles.seasonMenu}
                    onPress={() => setSeasonPickerOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose season, current ${current?.name || `Season ${selectedSeason}`}`}
                  >
                    <Text style={styles.seasonMenuText}>{current?.name || `Season ${selectedSeason}`}</Text>
                    {currentRating != null && (
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={10} color="#FFF" />
                        <Text style={styles.ratingBadgeText}>{currentRating}</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-expand" size={14} color={colors.appleText2} />
                  </Pressable>
                );
              })()}
              <Modal
                visible={seasonPickerOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setSeasonPickerOpen(false)}
              >
                <View style={styles.seasonSheetRoot}>
                  <Pressable style={styles.seasonSheetScrim} accessibilityLabel="Close season picker" onPress={() => setSeasonPickerOpen(false)} />
                  <View style={styles.seasonSheet}>
                    <View style={styles.seasonSheetGrabber} />
                    <ScrollView bounces={false}>
                      {availableSeasons.map((s: any, i: number) => {
                        const isSelected = selectedSeason === s.season_number;
                        const rating = mySeasonRatings[s.season_number];
                        return (
                          <Pressable
                            key={s.id || s.season_number}
                            onPress={() => {
                              setSelectedSeason(s.season_number);
                              setSeasonPickerOpen(false);
                            }}
                            style={[styles.seasonSheetRow, i > 0 && styles.seasonSheetRowSep]}
                            accessibilityRole="button"
                            accessibilityLabel={s.name || `Season ${s.season_number}`}
                          >
                            <Text style={styles.seasonSheetRowText}>{s.name || `Season ${s.season_number}`}</Text>
                            {rating != null && (
                              <View style={styles.ratingBadge}>
                                <Ionicons name="star" size={10} color="#FFF" />
                                <Text style={styles.ratingBadgeText}>{rating}</Text>
                              </View>
                            )}
                            <View style={{ flex: 1 }} />
                            {isSelected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              </Modal>

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

          {/* Merged Cast & Crew (owner rule, 25 Nov): directors first, then cast */}
          {(directors.length > 0 || cast.length > 0) && (
            <View style={styles.castSection}>
              <Text style={styles.sectionHeading}>Cast & Crew</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.castScroll}
              >
                {directors.map((member) => {
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
                      <Text style={styles.actorName} numberOfLines={2}>
                        {member.name}
                      </Text>
                      <Text style={styles.characterName} numberOfLines={2}>
                        {member.job}
                      </Text>
                    </Pressable>
                  );
                })}
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
                      <Text style={styles.actorName} numberOfLines={2}>
                        {actor.name}
                      </Text>
                      <Text style={styles.characterName} numberOfLines={2}>
                        {actor.character}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* The old "Reviews / Write a review" box is removed (ReviewsSection.tsx is kept, unused). */}

          {/* Similar Titles Carousel */}
          {similarMoviesQuery.data && similarMoviesQuery.data.length > 0 && (
            <View style={styles.similarSection}>
              <MovieCarousel
                title="More Like This"
                data={similarMoviesQuery.data}
                onItemPress={handleSimilarItemPress}
                minimal
                cardWidth={104}
                cardHeight={156}
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
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(28,28,32,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    height: 250,
    backgroundColor: colors.cardBackground,
  },
  detailHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    marginTop: -72,
    marginBottom: 2,
  },
  detailTitleCol: {
    flex: 1,
    gap: 4,
    paddingBottom: 2,
  },
  metaLineText: {
    color: colors.appleText2,
    fontSize: 13,
    fontWeight: '500',
  },
  genresLineText: {
    color: colors.appleText3,
    fontSize: 13,
  },
  genresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  posterWrap: {
    width: 96,
    height: 144,
    position: 'relative',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  poster: {
    width: 96,
    height: 144,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
  },
  playButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(30, 30, 36, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  mainInfo: {
    marginTop: 0,
    paddingHorizontal: metrics.screenHorizontalPadding,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.4,
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
    backgroundColor: colors.appleCard,
    borderRadius: 14,
    paddingVertical: 12,
  },
  statCell: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
  },
  statCellDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderColor: colors.appleSeparator,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  statValueAccent: {
    color: '#FF9F0A',
  },
  statLabel: {
    color: colors.appleText2,
    fontSize: 12,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 14,
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
    width: 84,
    alignItems: 'center',
  },
  actorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceLight,
    overflow: 'hidden',
    marginBottom: 6,
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
  },
  actorName: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  characterName: {
    color: colors.appleText2,
    fontSize: 11,
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
  seasonMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  seasonMenuText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  seasonSheetRoot: { flex: 1, justifyContent: 'flex-end' },
  seasonSheetScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.72)' },
  seasonSheet: {
    backgroundColor: colors.appleCard,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 10,
    paddingBottom: 34,
    maxHeight: '60%',
  },
  seasonSheetGrabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.appleSeparator,
    marginBottom: 6,
  },
  seasonSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  seasonSheetRowSep: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.appleSeparator,
  },
  seasonSheetRowText: {
    color: colors.textPrimary,
    fontSize: 16,
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
