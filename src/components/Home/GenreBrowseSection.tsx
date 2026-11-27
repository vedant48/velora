import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MOVIE_GENRES, TV_GENRES } from '../../api/genres';
import { SectionHeader } from '../MovieCarousel/SectionHeader';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { metrics } from '../../theme/metrics';
import { ui } from '../../theme/ui';

interface GenreBrowseSectionProps {
  filter: 'all' | 'movies' | 'tv';
  onPressGenre: (genreId: number, genreName: string, mediaType: 'movie' | 'tv') => void;
}

function GenreGroup({
  title,
  genres,
  mediaType,
  onPressGenre,
  colors,
  styles,
}: {
  title: string;
  genres: Record<number, string>;
  mediaType: 'movie' | 'tv';
  onPressGenre: GenreBrowseSectionProps['onPressGenre'];
  colors: AppColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.chips}>
        {Object.entries(genres).map(([id, name]) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={`${name} ${mediaType === 'movie' ? 'movies' : 'series'}`}
            onPress={() => onPressGenre(Number(id), name, mediaType)}
            style={({ pressed }) => [styles.chip, pressed && { backgroundColor: colors.surfaceLight }]}
          >
            <Text style={styles.chipText}>{name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** "Browse by genre": every TMDB movie genre and every series genre, each opening
 *  the existing genre results screen. Groups collapse to one when filtered. */
export const GenreBrowseSection: React.FC<GenreBrowseSectionProps> = React.memo(({ filter, onPressGenre }) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View>
      <SectionHeader title="Browse by genre" subtitle="Every mood, movies and series" />
      {filter !== 'tv' && (
        <GenreGroup title="Movies" genres={MOVIE_GENRES} mediaType="movie" onPressGenre={onPressGenre} colors={colors} styles={styles} />
      )}
      {filter !== 'movies' && (
        <GenreGroup title="Series" genres={TV_GENRES} mediaType="tv" onPressGenre={onPressGenre} colors={colors} styles={styles} />
      )}
    </View>
  );
});
GenreBrowseSection.displayName = 'GenreBrowseSection';

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    group: { paddingHorizontal: metrics.screenHorizontalPadding, marginBottom: ui.space.lg },
    groupTitle: { color: colors.textSecondary, fontSize: ui.type.label, fontWeight: '600', marginBottom: ui.space.sm },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: ui.space.sm },
    chip: {
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: ui.purpose.chipRadius,
      backgroundColor: colors.appleFill,
    },
    chipText: { color: colors.appleText, fontSize: 13, fontWeight: '500' },
  });
