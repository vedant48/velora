import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FlashList } from '@shopify/flash-list';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCollectionQuery } from '../../api/queries';
import { MediaItem } from '../../api/types';
import { veloraApi } from '../../api/velora';
import { CachedImage as Image } from '../../experience/CachedImage';
import { AppLoader } from '../../components/common/AppLoader';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../state/AuthContext';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { getImageUrl, IMAGE_CONFIG } from '../../utils/image';

type CollectionRouteProp = RouteProp<RootStackParamList, 'Collection'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/** Grid of one TMDB collection's movies (opened from the Explore Collections rail). */
export const CollectionScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const route = useRoute<CollectionRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { collectionId, collectionName } = route.params;

  const query = useCollectionQuery(collectionId);
  const data = useMemo(() => query.data ?? [], [query.data]);
  const { user, apiReady } = useAuth();

  // Apple redesign: tracked status per title drives the row subtitle and the
  // check/plus affordance (same library data the Explore hero uses).
  const [tracked, setTracked] = useState<Record<number, string>>({});
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (user && apiReady) {
        veloraApi
          .getLibrary()
          .then(({ items }) => {
            if (!active) return;
            setTracked(
              Object.fromEntries(
                items.filter((i) => i.media_type === 'movie').map((i) => [i.tmdb_id, i.status])
              )
            );
          })
          .catch(() => undefined);
      }
      return () => {
        active = false;
      };
    }, [user?.username, apiReady])
  );

  const addToWant = useCallback(
    async (item: MediaItem) => {
      if (!user || !apiReady) {
        navigation.navigate('Auth');
        return;
      }
      try {
        await veloraApi.upsertItem({
          mediaType: 'movie',
          tmdbId: item.id,
          title: item.title,
          posterPath: item.poster_path,
          backdropPath: item.backdrop_path,
          releaseDate: item.release_date ?? null,
          status: 'want',
        });
        setTracked((prev) => ({ ...prev, [item.id]: 'want' }));
      } catch {
        /* failed add stays untracked; retry from the details page */
      }
    },
    [user, apiReady, navigation]
  );

  const heroBackdrop = getImageUrl(data[0]?.backdrop_path || data[0]?.poster_path || null, 'backdrop');

  const handleItemPress = useCallback(
    (item: MediaItem) => {
      navigation.push('Details', { item });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: MediaItem; index: number }) => {
      const status = tracked[item.id];
      const year = (item.release_date ?? '').slice(0, 4);
      const sub = [year, status === 'watched' ? 'Watched' : status === 'want' ? 'In your Want list' : '']
        .filter(Boolean)
        .join(' · ');
      const thumb = getImageUrl(item.backdrop_path || item.poster_path || null, 'thumbnail');
      return (
        <Pressable onPress={() => handleItemPress(item)} style={styles.row} accessibilityRole="button" accessibilityLabel={item.title}>
          {thumb ? (
            <Image
              source={{ uri: thumb }}
              style={styles.thumb}
              contentFit="cover"
              transition={IMAGE_CONFIG.transition}
              cachePolicy={IMAGE_CONFIG.cachePolicy}
              placeholder={IMAGE_CONFIG.placeholder}
            />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]} />
          )}
          <View style={styles.rowMeta}>
            <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
            {!!sub && <Text style={styles.rowSub} numberOfLines={1}>{sub}</Text>}
          </View>
          {status ? (
            <Ionicons name="checkmark-circle" size={22} color={colors.appleBlue} />
          ) : (
            <Pressable
              onPress={() => void addToWant(item)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Add ${item.title} to Want`}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
            </Pressable>
          )}
        </Pressable>
      );
    },
    [handleItemPress, tracked, addToWant, styles, colors],
  );

  return (
    <View style={styles.root}>
      {query.isLoading ? (
        <AppLoader style={{ marginTop: 40 }} />
      ) : query.isError ? (
        <Pressable accessibilityRole="button" onPress={() => query.refetch()} style={{padding: 24}}><Text style={{color: colors.textPrimary}}>Could not load collection. Tap to retry.</Text></Pressable>
      ) : data.length === 0 ? <Text style={{padding: 24, color: colors.textSecondary}}>No titles in this collection.</Text> : (
        <FlashList
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListHeaderComponent={
            <View style={[styles.hero, { height: 210 + insets.top }]}>
              {heroBackdrop ? (
                <Image
                  source={{ uri: heroBackdrop }}
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
              <View style={styles.heroTitle}>
                <Text style={styles.heroEyebrow}>Collection</Text>
                <Text style={styles.heroName}>{collectionName}</Text>
              </View>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
      {/* Floating back circle over the hero (approved mock) */}
      <Pressable
        onPress={() => navigation.goBack()}
        style={[styles.backButton, { top: Math.max(insets.top, 12) + 4 }]}
        hitSlop={8}
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={22} color="#FFF" />
      </Pressable>
    </View>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hero: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: -20,
    marginTop: -10,
    marginBottom: 10,
    justifyContent: 'flex-end',
  },
  heroTitle: { paddingHorizontal: 20, paddingBottom: 14 },
  heroEyebrow: {
    color: 'rgba(235,235,245,0.75)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroName: { color: '#FFF', fontSize: 24, fontWeight: '700', letterSpacing: -0.4, marginTop: 2 },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(28,28,32,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
  },
  thumb: { width: 66, height: 44, borderRadius: 8, backgroundColor: colors.surfaceLight },
  thumbPlaceholder: {},
  rowMeta: { flex: 1, gap: 1 },
  rowTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  rowSub: { color: colors.appleText2, fontSize: 13 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.appleSeparator, marginLeft: 78 },
});
