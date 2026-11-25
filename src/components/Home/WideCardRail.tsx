import { LinearGradient } from 'expo-linear-gradient';
import React, { memo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { genreNames } from '../../api/genres';
import { MediaItem } from '../../api/types';
import { CachedImage as Image } from '../../experience/CachedImage';
import { useAppTheme } from '../../theme/ThemeContext';
import { getImageUrl, IMAGE_CONFIG } from '../../utils/image';
import { SectionHeader } from '../MovieCarousel/SectionHeader';

interface WideCardRailProps {
  title: string;
  items: MediaItem[];
  onItemPress: (item: MediaItem) => void;
}

const CARD_WIDTH = 300;
const CARD_HEIGHT = 170;

const WideCard = memo(({ item, onItemPress }: { item: MediaItem; onItemPress: (item: MediaItem) => void }) => {
  const { colors } = useAppTheme();
  const backdrop = getImageUrl(item.backdrop_path || item.poster_path || null, 'backdrop');
  const genres = genreNames(item.genre_ids, item.media_type === 'tv' ? 'tv' : 'movie');
  return (
    <Pressable
      onPress={() => onItemPress(item)}
      style={[styles.card, { backgroundColor: colors.surfaceLight }]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      {backdrop ? (
        <Image
          source={{ uri: backdrop }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={IMAGE_CONFIG.transition}
          cachePolicy={IMAGE_CONFIG.cachePolicy}
          placeholder={IMAGE_CONFIG.placeholder}
        />
      ) : null}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']}
        locations={[0.35, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.cardText}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {genres ? (
          <Text style={styles.cardGenres} numberOfLines={1}>
            {genres}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

/** Apple redesign: wide backdrop cards with title + genre line (approved explore-all mock). */
export const WideCardRail = memo(({ title, items, onItemPress }: WideCardRailProps) => {
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.root}>
      <SectionHeader title={title} />
      <FlatList
        horizontal
        data={items.slice(0, 10)}
        keyExtractor={(item) => `${item.media_type ?? 'movie'}:${item.id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <WideCard item={item} onItemPress={onItemPress} />}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardText: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  cardGenres: {
    color: 'rgba(235,235,245,0.75)',
    fontSize: 12,
    marginTop: 2,
  },
});
