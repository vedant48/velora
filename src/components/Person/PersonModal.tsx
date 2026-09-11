import React, { memo, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { usePersonDetailsQuery, usePersonCreditsQuery } from '../../api/queries';
import { MediaItem, PersonCreditItem } from '../../api/types';
import { getPosterUrl } from '../../utils/image';
import { colors } from '../../theme/colors';
import { metrics } from '../../theme/metrics';
import { MovieCard } from '../MovieCard/MovieCard';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PersonModalProps {
  visible: boolean;
  personId: number | null;
  onClose: () => void;
  onSelectMedia: (item: MediaItem) => void;
}

export const PersonModal = memo(
  ({ visible, personId, onClose, onSelectMedia }: PersonModalProps) => {
    const [isBioExpanded, setIsBioExpanded] = useState(false);

    const { data: person, isLoading: isPersonLoading } = usePersonDetailsQuery(personId);
    const { data: creditsData, isLoading: isCreditsLoading } = usePersonCreditsQuery(personId);

    // Merge and deduplicate cast + crew credits, sort by popularity/vote_average
    const knownForMedia: MediaItem[] = useMemo(() => {
      if (!creditsData) return [];
      const combined: PersonCreditItem[] = [
        ...(creditsData.cast || []),
        ...(creditsData.crew || []),
      ];

      const seen = new Set<number>();
      const uniqueMedia: MediaItem[] = [];

      // Sort by vote_average descending
      const sorted = [...combined].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));

      for (const item of sorted) {
        if (!seen.has(item.id) && (item.poster_path || item.backdrop_path)) {
          seen.add(item.id);
          uniqueMedia.push({
            id: item.id,
            media_type: item.media_type || (item.title ? 'movie' : 'tv'),
            title: item.title || item.name || '',
            overview: item.overview || '',
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            vote_average: item.vote_average || 0,
            release_date: item.release_date || item.first_air_date,
            genre_ids: [],
          });
        }
      }

      return uniqueMedia.slice(0, 20); // Top 20 titles
    }, [creditsData]);

    if (!personId) return null;

    const profileUrl = person?.profile_path
      ? getPosterUrl(person.profile_path, 'w342')
      : null;

    const isLoading = isPersonLoading || isCreditsLoading;

    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          {/* Backdrop dismiss */}
          <Pressable style={styles.backdrop} onPress={onClose} />

          <View style={styles.sheetContainer}>
            {/* Top Grab Bar / Header */}
            <View style={styles.topBar}>
              <View style={styles.grabHandle} />
              <Pressable
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
              </Pressable>
            </View>

            {isLoading && !person ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading details...</Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {/* Person Profile Header */}
                <View style={styles.profileHeader}>
                  <View style={styles.avatarContainer}>
                    {profileUrl ? (
                      <Image
                        source={{ uri: profileUrl }}
                        style={styles.avatar}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={42} color={colors.textMuted} />
                      </View>
                    )}
                  </View>

                  <View style={styles.infoColumn}>
                    <Text style={styles.personName}>{person?.name}</Text>
                    {person?.known_for_department && (
                      <View style={styles.deptBadge}>
                        <Text style={styles.deptText}>
                          {person.known_for_department.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {person?.place_of_birth && (
                      <Text style={styles.birthText} numberOfLines={1}>
                        <Ionicons name="location-outline" size={13} color={colors.textMuted} />{' '}
                        {person.place_of_birth}
                      </Text>
                    )}
                    {person?.birthday && (
                      <Text style={styles.birthText}>
                        <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />{' '}
                        {person.birthday}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Biography */}
                {person?.biography ? (
                  <View style={styles.bioSection}>
                    <Text style={styles.sectionHeading}>Biography</Text>
                    <Text
                      style={styles.bioText}
                      numberOfLines={isBioExpanded ? undefined : 4}
                    >
                      {person.biography}
                    </Text>
                    {person.biography.length > 200 && (
                      <Pressable
                        onPress={() => setIsBioExpanded((prev) => !prev)}
                        style={styles.readMoreBtn}
                      >
                        <Text style={styles.readMoreText}>
                          {isBioExpanded ? 'Show Less' : 'Read Full Bio'}
                        </Text>
                        <Ionicons
                          name={isBioExpanded ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color={colors.primary}
                        />
                      </Pressable>
                    )}
                  </View>
                ) : null}

                {/* Known For / Filmography */}
                <View style={styles.filmographySection}>
                  <View style={styles.filmographyHeaderRow}>
                    <Text style={styles.sectionHeading}>Known For</Text>
                    <Text style={styles.countText}>{knownForMedia.length} titles</Text>
                  </View>

                  {knownForMedia.length === 0 ? (
                    <Text style={styles.emptyText}>No titles found</Text>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.mediaRow}
                    >
                      {knownForMedia.map((item) => (
                        <MovieCard
                          key={`person-media-${item.id}`}
                          item={item}
                          onPress={(selected) => {
                            onClose();
                            onSelectMedia(selected);
                          }}
                          width={110}
                          height={165}
                          showTitle
                          hasMarginRight
                        />
                      ))}
                    </ScrollView>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    minHeight: SCREEN_HEIGHT * 0.5,
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  topBar: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  grabHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 8,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: metrics.screenHorizontalPadding,
    paddingBottom: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: metrics.spacingMd,
  },
  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLight,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoColumn: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  personName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  deptBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    borderColor: 'rgba(229, 9, 20, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  deptText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  birthText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
    marginTop: 2,
  },
  bioSection: {
    marginTop: metrics.spacingSm,
    marginBottom: metrics.spacingMd,
    backgroundColor: colors.surfaceLight,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  bioText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  filmographySection: {
    marginTop: metrics.spacingSm,
  },
  filmographyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  mediaRow: {
    paddingVertical: 4,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '400',
    marginTop: 8,
  },
});
