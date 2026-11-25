import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { genreNames } from '../../api/genres';
import { MediaItem } from '../../api/types';
import { CachedImage as Image } from '../../experience/CachedImage';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';

const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/w780';

interface HeroBannerProps {
  item: MediaItem;
  eyebrow: string;
  tracked?: string;
  onDetails: (item: MediaItem) => void;
  onWant: (item: MediaItem) => void;
}

/** Apple redesign: full-bleed hero with gradient shade, title/meta, Want + Details buttons. */
export const HeroBanner: React.FC<HeroBannerProps> = ({ item, eyebrow, tracked, onDetails, onWant }) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const year = (item.release_date ?? '').slice(0, 4);
  const genres = genreNames(item.genre_ids, item.media_type === 'tv' ? 'tv' : 'movie');
  const uri = item.backdrop_path ? `${TMDB_BACKDROP}${item.backdrop_path}` : item.poster_path ? `${TMDB_BACKDROP}${item.poster_path}` : null;
  const inLibrary = !!tracked;
  return (
    <View style={styles.hero}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} recyclingKey={uri} /> : null}
      <LinearGradient colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.92)']} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <View style={styles.metaRow}>
          {!!year && <Text style={styles.meta}>{year}</Text>}
          {!!genres && <Text style={styles.meta}>{`${year ? ' · ' : ''}${genres}`}</Text>}
          {item.vote_average > 0 && (
            <>
              {(!!year || !!genres) && <Text style={styles.meta}> · </Text>}
              <Ionicons name="star" size={12} color={colors.appleAmber} />
              <Text style={styles.meta}> {item.vote_average.toFixed(1)}</Text>
            </>
          )}
        </View>
        <View style={styles.buttons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={inLibrary ? `${item.title} is in your library` : `Add ${item.title} to Want`}
            disabled={inLibrary}
            onPress={() => onWant(item)}
            style={[styles.button, inLibrary ? styles.trackedButton : styles.wantButton]}
          >
            <Ionicons name={inLibrary ? 'checkmark' : 'add'} size={16} color="#fff" />
            <Text style={styles.buttonText}>{inLibrary ? 'In library' : 'Want'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Details for ${item.title}`} onPress={() => onDetails(item)} style={[styles.button, styles.detailsButton]}>
            <Text style={styles.buttonText}>Details</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  hero: { height: 330, marginBottom: 14, overflow: 'hidden', backgroundColor: colors.appleCard },
  copy: { position: 'absolute', left: 20, right: 20, bottom: 14 },
  eyebrow: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(235,235,245,0.75)' },
  title: { marginTop: 4, fontSize: 24, fontWeight: '700', lineHeight: 29, color: '#fff' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 10 },
  meta: { fontSize: 13, color: 'rgba(235,235,245,0.75)' },
  buttons: { flexDirection: 'row', gap: 10 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  wantButton: { backgroundColor: colors.primary },
  trackedButton: { backgroundColor: 'rgba(120,120,128,0.32)' },
  detailsButton: { backgroundColor: 'rgba(120,120,128,0.32)' },
  buttonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
