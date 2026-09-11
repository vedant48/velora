import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { MediaItem } from '../../api/types';
import {
  useMovieDetailsQuery,
  useMovieCreditsQuery,
  useSimilarMoviesQuery,
  useTVDetailsQuery,
  useTVCreditsQuery,
  useSeasonEpisodesQuery,
} from '../../api/queries';
import { Episode } from '../../api/types';
import { useWatchlist } from '../../hooks/useWatchlist';
import { useContinueWatching } from '../../hooks/useContinueWatching';
import { Badge } from '../../components/common/Badge';
import { MovieCarousel } from '../../components/MovieCarousel/MovieCarousel';
import { WatchProviders } from '../../components/Details/WatchProviders';
import { PersonModal } from '../../components/Person/PersonModal';
import { getImageUrl, IMAGE_CONFIG } from '../../utils/image';
import { formatRuntime, formatYear, formatRating } from '../../utils/format';
import { colors } from '../../theme/colors';
import { metrics } from '../../theme/metrics';
import { typography } from '../../theme/typography';

type DetailsRouteProp = RouteProp<RootStackParamList, 'Details'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const DetailsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<DetailsRouteProp>();
  const navigation = useNavigation<NavigationProp>();

  // Instant Display Data from route params (passed from card)
  const initialItem = route.params.item;
  const isMovie = initialItem.media_type === 'movie' || (!initialItem.media_type && !Boolean((initialItem as any).first_air_date));
  const isTV = !isMovie;

  const [selectedSeason, setSelectedSeason] = useState(1);
  const [isPlayingMock, setIsPlayingMock] = useState(false);
  const [playerTitle, setPlayerTitle] = useState(initialItem.title);
  const [playerSubtitle, setPlayerSubtitle] = useState('Streaming in 4K HDR Dolby Vision');
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [isPersonModalVisible, setIsPersonModalVisible] = useState(false);

  // Background Queries for full details, cast credits, similar titles, and episodes
  const movieDetailsQuery = useMovieDetailsQuery(isMovie ? initialItem.id : 0);
  const movieCreditsQuery = useMovieCreditsQuery(isMovie ? initialItem.id : 0);
  const tvDetailsQuery = useTVDetailsQuery(isTV ? initialItem.id : 0);
  const tvCreditsQuery = useTVCreditsQuery(isTV ? initialItem.id : 0);
  const similarMoviesQuery = useSimilarMoviesQuery(initialItem.id);
  const seasonEpisodesQuery = useSeasonEpisodesQuery(isTV ? initialItem.id : 0, selectedSeason);

  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { updateProgress } = useContinueWatching();

  const isSaved = isInWatchlist(initialItem.id);

  // Merged Details
  const details = isMovie ? movieDetailsQuery.data : tvDetailsQuery.data;
  const credits = isMovie ? movieCreditsQuery.data : tvCreditsQuery.data;

  const title = (details as any)?.title || (details as any)?.name || initialItem.title;
  const overview = details?.overview || initialItem.overview;
  const backdropUrl = getImageUrl(
    details?.backdrop_path || initialItem.backdrop_path || initialItem.poster_path,
    'backdrop'
  );
  const posterUrl = getImageUrl(
    details?.poster_path || initialItem.poster_path,
    'poster'
  );

  const releaseDate =
    (details as any)?.release_date ||
    (details as any)?.first_air_date ||
    initialItem.release_date;

  const runtime = (details as any)?.runtime;
  const genres = details?.genres || [];

  // Available seasons for TV shows
  const availableSeasons = useMemo(() => {
    const seasons = (details as any)?.seasons || [];
    const valid = seasons.filter((s: any) => s.season_number > 0);
    return valid.length > 0 ? valid : [{ id: 1, season_number: 1, name: 'Season 1' }];
  }, [details]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleWatchlistToggle = useCallback(() => {
    toggleWatchlist(initialItem);
  }, [initialItem, toggleWatchlist]);

  const handlePlay = useCallback(() => {
    setPlayerTitle(title);
    setPlayerSubtitle('Streaming in 4K HDR Dolby Vision');
    setIsPlayingMock(true);
    // Save to Continue Watching
    updateProgress({
      movieId: initialItem.id,
      title: initialItem.title,
      poster_path: initialItem.poster_path,
      backdrop_path: initialItem.backdrop_path,
      progress: 600, // 10 minutes watched
      duration: (runtime || 120) * 60,
      media_type: initialItem.media_type,
    });
  }, [initialItem, runtime, title, updateProgress]);

  const handlePlayEpisode = useCallback(
    (ep: Episode) => {
      setPlayerTitle(`${title} • S${selectedSeason} E${ep.episode_number}`);
      setPlayerSubtitle(ep.name);
      setIsPlayingMock(true);
      updateProgress({
        movieId: initialItem.id,
        title: `${title} • S${selectedSeason} E${ep.episode_number} - ${ep.name}`,
        poster_path: ep.still_path || initialItem.poster_path,
        backdrop_path: ep.still_path || initialItem.backdrop_path,
        progress: 300,
        duration: (ep.vote_average ? 45 : 30) * 60,
        media_type: 'tv',
      });
    },
    [initialItem, selectedSeason, title, updateProgress]
  );

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

  const handleGenrePress = useCallback(
    (g: { id: number; name: string }) => {
      navigation.push('Genre', {
        genreId: g.id,
        genreName: g.name,
        mediaType: isMovie ? 'movie' : 'tv',
      });
    },
    [isMovie, navigation]
  );

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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Floating Back & Share Buttons */}
      <View style={[styles.floatingHeader, { top: Math.max(insets.top, 12) }]}>
        <Pressable
          onPress={handleBack}
          style={styles.circleButton}
          hitSlop={8}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </Pressable>

        <View style={styles.headerRightActions}>
          <Pressable
            onPress={handleWatchlistToggle}
            style={[styles.circleButton, isSaved && styles.circleButtonActive]}
            hitSlop={8}
            accessibilityLabel="Toggle Watchlist"
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={isSaved ? colors.primary : '#FFF'}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Parallax Backdrop Header */}
        <View style={styles.backdropContainer}>
          <Image
            source={backdropUrl ? { uri: backdropUrl } : undefined}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            priority="high"
            transition={IMAGE_CONFIG.transition}
            cachePolicy={IMAGE_CONFIG.cachePolicy}
            placeholder={IMAGE_CONFIG.placeholder}
          />
          <LinearGradient
            colors={['transparent', 'rgba(9, 9, 11, 0.6)', '#09090B']}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Content Section */}
        <View style={styles.mainInfo}>
          {/* Metadata Row: Year, Runtime/Seasons, Rating, HD badge */}
          <View style={styles.metaRow}>
            {releaseDate ? (
              <Text style={styles.metaText}>{formatYear(releaseDate)}</Text>
            ) : null}
            {runtime ? (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>{formatRuntime(runtime)}</Text>
              </>
            ) : (details as any)?.number_of_seasons ? (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>
                  {(details as any).number_of_seasons} Season
                  {(details as any).number_of_seasons > 1 ? 's' : ''}
                </Text>
              </>
            ) : null}
            <Badge rating={initialItem.vote_average} variant="rating" />
            <Badge variant="hd" />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Genre Badges */}
          {genres.length > 0 && (
            <View style={styles.genreList}>
              {genres.map((g) => (
                <Pressable
                  key={g.id}
                  onPress={() => handleGenrePress(g)}
                  style={styles.genrePill}
                  hitSlop={6}
                >
                  <Text style={styles.genrePillText}>{g.name}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={10}
                    color={colors.textMuted}
                    style={{ marginLeft: 3 }}
                  />
                </Pressable>
              ))}
            </View>
          )}

          {/* Big Action CTA Buttons */}
          <View style={styles.actionsRow}>
            <Pressable
              onPress={handlePlay}
              style={styles.playButton}
              accessibilityRole="button"
            >
              <Ionicons name="play" size={20} color="#FFF" />
              <Text style={styles.playButtonText}>Watch Now</Text>
            </Pressable>

            <Pressable
              onPress={handleWatchlistToggle}
              style={[
                styles.actionSecondaryButton,
                isSaved && styles.actionSecondaryActive,
              ]}
              accessibilityRole="button"
            >
              <Ionicons
                name={isSaved ? 'checkmark' : 'add'}
                size={20}
                color={isSaved ? colors.primary : '#FFF'}
              />
              <Text
                style={[
                  styles.actionSecondaryText,
                  isSaved && { color: colors.primary },
                ]}
              >
                {isSaved ? 'In Watchlist' : 'Watchlist'}
              </Text>
            </Pressable>
          </View>

          {/* Synopsis */}
          <Text style={styles.sectionHeading}>Storyline</Text>
          <Text style={styles.overviewText}>
            {overview || 'No overview available for this title.'}
          </Text>

          {/* Where to Watch - Official Streaming Providers */}
          <WatchProviders id={initialItem.id} isMovie={isMovie} />


          {/* Seasons & Episodes Section for TV Series */}
          {isTV && (
            <View style={styles.episodesSection}>
              <View style={styles.episodesHeader}>
                <Text style={styles.sectionHeading}>Episodes</Text>
                <Text style={styles.episodesCountText}>
                  {seasonEpisodesQuery.data ? `${seasonEpisodesQuery.data.length} Episodes` : ''}
                </Text>
              </View>

              {/* Season Selector Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.seasonsScroll}
              >
                {availableSeasons.map((s: any) => {
                  const isSelected = selectedSeason === s.season_number;
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
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Episodes List */}
              {seasonEpisodesQuery.isLoading ? (
                <View style={styles.episodesLoading}>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <Text style={styles.loadingEpisodesText}>Loading season episodes...</Text>
                </View>
              ) : seasonEpisodesQuery.data && seasonEpisodesQuery.data.length > 0 ? (
                <View style={styles.episodesList}>
                  {seasonEpisodesQuery.data.map((ep) => {
                    const epStillUrl = getImageUrl(ep.still_path || backdropUrl, 'backdrop');
                    return (
                      <Pressable
                        key={ep.id || ep.episode_number}
                        onPress={() => handlePlayEpisode(ep)}
                        style={styles.episodeCard}
                      >
                        <View style={styles.episodeTopRow}>
                          {/* 16:9 Still with Play Icon */}
                          <View style={styles.episodeStillWrapper}>
                            <Image
                              source={epStillUrl ? { uri: epStillUrl } : undefined}
                              style={StyleSheet.absoluteFill}
                              contentFit="cover"
                              transition={IMAGE_CONFIG.transition}
                              cachePolicy={IMAGE_CONFIG.cachePolicy}
                              placeholder={IMAGE_CONFIG.placeholder}
                            />
                            <View style={styles.episodePlayOverlay}>
                              <Ionicons name="play" size={16} color="#FFF" />
                            </View>
                          </View>

                          {/* Episode Meta */}
                          <View style={styles.episodeMeta}>
                            <Text style={styles.episodeNumber}>
                              Episode {ep.episode_number}
                            </Text>
                            <Text style={styles.episodeTitle} numberOfLines={2}>
                              {ep.name}
                            </Text>
                            <View style={styles.episodeBadges}>
                              {ep.runtime ? (
                                <Text style={styles.episodeRuntime}>{ep.runtime}m</Text>
                              ) : null}
                              {ep.vote_average > 0 ? (
                                <Badge rating={ep.vote_average} variant="rating" />
                              ) : null}
                            </View>
                          </View>
                        </View>

                        {/* Episode Description */}
                        {ep.overview ? (
                          <Text style={styles.episodeOverview} numberOfLines={3}>
                            {ep.overview}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.noEpisodesText}>No episodes available for this season.</Text>
              )}
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

      {/* Mock Video Player Modal */}
      <Modal visible={isPlayingMock} animationType="fade" transparent={false}>
        <View style={styles.playerContainer}>
          <StatusBar hidden />
          <Image
            source={backdropUrl ? { uri: backdropUrl } : undefined}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <View style={styles.playerOverlay}>
            <Pressable
              onPress={() => setIsPlayingMock(false)}
              style={styles.playerCloseButton}
            >
              <Ionicons name="close" size={26} color="#FFF" />
            </Pressable>
            <View style={styles.playerCenter}>
              <Ionicons name="play-circle" size={80} color={colors.primary} />
              <Text style={styles.playerTitle}>{playerTitle}</Text>
              <Text style={styles.playerSubtitle}>{playerSubtitle}</Text>
            </View>
          </View>
        </View>
      </Modal>

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

const styles = StyleSheet.create({
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
    left: metrics.screenHorizontalPadding,
    right: metrics.screenHorizontalPadding,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(14, 14, 20, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  circleButtonActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.25)',
    borderColor: colors.primary,
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: 10,
  },
  backdropContainer: {
    width: metrics.screenWidth,
    height: Math.min(metrics.screenHeight * 0.44, 360),
    position: 'relative',
    backgroundColor: '#09090B',
  },
  mainInfo: {
    marginTop: -20,
    paddingHorizontal: metrics.screenHorizontalPadding,
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  metaDot: {
    color: colors.textTertiary,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  genreList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  genrePill: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  genrePillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 6,
  },
  playButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  playButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  actionSecondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionSecondaryActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
  },
  actionSecondaryText: {
    color: '#FFF',
    fontSize: 14,
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
  playerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerOverlay: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'space-between',
    padding: 24,
  },
  playerCloseButton: {
    alignSelf: 'flex-end',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 80,
  },
  playerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  playerSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
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
    fontSize: 12,
    fontWeight: '600',
  },
  seasonsScroll: {
    paddingVertical: 10,
    gap: 8,
  },
  seasonPill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  seasonPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  seasonPillText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  seasonPillTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  episodesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  loadingEpisodesText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  episodesList: {
    gap: 16,
    marginTop: 4,
  },
  episodeCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  episodeTopRow: {
    flexDirection: 'row',
    gap: 12,
  },
  episodeStillWrapper: {
    width: 120,
    height: 70,
    borderRadius: 6,
    backgroundColor: colors.surfaceLight,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodePlayOverlay: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeMeta: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  episodeNumber: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  episodeTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  episodeBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  episodeRuntime: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
  },
  episodeOverview: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  noEpisodesText: {
    color: colors.textTertiary,
    fontSize: 13,
    paddingVertical: 12,
  },
});
