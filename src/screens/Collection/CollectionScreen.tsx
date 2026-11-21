import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlashList } from '@shopify/flash-list';
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCollectionQuery } from '../../api/queries';
import { MediaItem } from '../../api/types';
import { MovieCard } from '../../components/MovieCard/MovieCard';
import { AppLoader } from '../../components/common/AppLoader';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { RootStackParamList } from '../../navigation/types';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { metrics } from '../../theme/metrics';

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

  const handleItemPress = useCallback(
    (item: MediaItem) => {
      navigation.push('Details', { item });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: MediaItem }) => (
      <View style={styles.cardWrap}>
        <MovieCard item={item} onPress={handleItemPress} />
      </View>
    ),
    [handleItemPress, styles],
  );

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={{paddingHorizontal: 16}}><ScreenHeader title={collectionName} onBack={() => navigation.goBack()} /></View>
      {query.isLoading ? (
        <AppLoader style={{ marginTop: 40 }} />
      ) : query.isError ? (
        <Pressable accessibilityRole="button" onPress={() => query.refetch()} style={{padding: 24}}><Text style={{color: colors.textPrimary}}>Could not load collection. Tap to retry.</Text></Pressable>
      ) : data.length === 0 ? <Text style={{padding: 24, color: colors.textSecondary}}>No titles in this collection.</Text> : (
        <FlashList
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          numColumns={3}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: metrics.screenHorizontalPadding,
    paddingBottom: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  title: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 40,
  },
  cardWrap: {
    flex: 1 / 3,
    padding: 4,
  },
});
