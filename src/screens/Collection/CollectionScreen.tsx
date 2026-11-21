import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { MediaItem } from '../../api/types';
import { useCollectionQuery } from '../../api/queries';
import { MovieCard } from '../../components/MovieCard/MovieCard';
import { colors } from '../../theme/colors';
import { metrics } from '../../theme/metrics';

type CollectionRouteProp = RouteProp<RootStackParamList, 'Collection'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/** Grid of one TMDB collection's movies (opened from the Explore Collections rail). */
export const CollectionScreen: React.FC = () => {
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
    [handleItemPress],
  );

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {collectionName}
        </Text>
      </View>
      {query.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
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

const styles = StyleSheet.create({
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
