import { CachedImage as Image } from '../../experience/CachedImage';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MediaItem } from '../../api/types';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { ui } from '../../theme/ui';

export const SearchPoster = memo(function SearchPoster({ item, width, onPress, labels = true }: {
  item: MediaItem; width: number; onPress: (item: MediaItem) => void; labels?: boolean;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={() => onPress(item)} style={{ width }}>
    {item.poster_path ? <Image source={{ uri: `https://image.tmdb.org/t/p/w342${item.poster_path}` }} style={[styles.poster, { width }]} contentFit="cover" /> : <View style={[styles.poster, { width }]} />}
    {labels && <><Text numberOfLines={2} style={styles.title}>{item.title}</Text><Text style={styles.year}>{item.release_date?.slice(0, 4)}</Text></>}
  </Pressable>;
});
const createStyles = (colors: AppColors) => StyleSheet.create({
  poster: { aspectRatio: 2 / 3, borderRadius: 3, backgroundColor: colors.surfaceLight },
  title: { color: colors.textSecondary, fontSize: ui.type.caption, textAlign: 'center', marginTop: 6 },
  year: { color: colors.textTertiary, fontSize: 10, textAlign: 'center', marginTop: 3 },
});
