import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useGenreInfiniteQuery } from '../../api/queries';
import { MediaItem } from '../../api/types';
import { BottomSheet } from '../common/BottomSheet';
import { SearchPoster, SEARCH_POSTER_RADIUS } from '../Library/SearchPoster';
import { PosterGridSkeleton } from '../Skeleton/ContentSkeletons';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { metrics } from '../../theme/metrics';
import { ui } from '../../theme/ui';

interface GenreTitlesSheetProps {
  genreId: number;
  genreName: string;
  mediaType: 'movie' | 'tv';
  onClose: () => void;
  onSeeAll: () => void;
  onPressItem: (item: MediaItem) => void;
}

/** Bottom drawer from a details-page genre tap: titles of that genre, always
 *  constrained to the originating media type. "See all" opens the full screen. */
export function GenreTitlesSheet({ genreId, genreName, mediaType, onClose, onSeeAll, onPressItem }: GenreTitlesSheetProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { data, isLoading } = useGenreInfiniteQuery(genreId, mediaType);
  const items = useMemo(() => {
    const flat = (data?.pages ?? []).flat();
    const seen = new Set<number>();
    return flat.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
  }, [data]);

  const columns = 3;
  const gap = 10;
  const cardWidth = Math.floor((metrics.screenWidth - ui.space.lg * 2 - (columns - 1) * gap) / columns);

  return (
    <BottomSheet visible onClose={onClose} showHandle>
      <View style={styles.headerRow} testID={`genre-sheet-${mediaType}`}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{genreName}</Text>
          <Text style={styles.subtitle}>{mediaType === 'movie' ? 'Movies' : 'Series'}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`See all ${genreName}`} testID="genre-sheet-see-all" onPress={onSeeAll} hitSlop={8}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <PosterGridSkeleton count={6} columns={columns} gap={gap} tileWidth={cardWidth} tileRadius={SEARCH_POSTER_RADIUS} labels horizontalPadding={0} />
        ) : (
          <View style={[styles.grid, { gap }]}>
            {items.map((item) => (
              <View key={`${item.media_type}:${item.id}`} style={{ marginBottom: gap }}>
                <SearchPoster item={item} width={cardWidth} onPress={onPressItem} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: ui.space.lg,
      paddingBottom: ui.space.md,
    },
    title: { color: colors.appleText, fontSize: ui.type.heading, fontWeight: '700' },
    subtitle: { color: colors.textTertiary, fontSize: ui.type.caption, marginTop: 2 },
    seeAll: { color: colors.primary, fontSize: 13, fontWeight: '600', padding: ui.space.sm },
    scroll: { maxHeight: 420, paddingHorizontal: ui.space.lg },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
  });
