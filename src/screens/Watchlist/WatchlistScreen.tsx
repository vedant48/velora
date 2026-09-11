import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { MediaItem } from '../../api/types';
import { useWatchlist } from '../../hooks/useWatchlist';
import { MovieCard } from '../../components/MovieCard/MovieCard';
import { colors } from '../../theme/colors';
import { metrics } from '../../theme/metrics';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const WatchlistScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { watchlist } = useWatchlist();

  const handleItemPress = useCallback(
    (item: MediaItem) => {
      navigation.navigate('Details', { item });
    },
    [navigation]
  );

  const handleExplore = useCallback(() => {
    (navigation as any).navigate('MainTabs', { screen: 'HomeTab' });
  }, [navigation]);

  // 3-column grid calculation
  const numColumns = 3;
  const availableWidth = metrics.screenWidth - metrics.screenHorizontalPadding * 2;
  const gap = 10;
  const cardWidth = Math.floor((availableWidth - (numColumns - 1) * gap) / numColumns);
  const cardHeight = Math.floor(cardWidth * 1.5);

  const renderItem: ListRenderItem<MediaItem> = useCallback(
    ({ item }) => (
      <View style={{ marginBottom: gap }}>
        <MovieCard
          item={item}
          onPress={handleItemPress}
          width={cardWidth}
          height={cardHeight}
        />
      </View>
    ),
    [cardWidth, cardHeight, handleItemPress]
  );

  const keyExtractor = useCallback((item: MediaItem) => item.id.toString(), []);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Watchlist</Text>
        <Text style={styles.headerCount}>{watchlist.length} titles</Text>
      </View>

      {/* Grid or Empty State */}
      {watchlist.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="bookmark-outline" size={44} color={colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>Your Watchlist is Empty</Text>
          <Text style={styles.emptySubtitle}>
            Save movies and TV shows you want to watch later by tapping the bookmark or + button.
          </Text>
          <Pressable onPress={handleExplore} style={styles.exploreButton}>
            <Text style={styles.exploreButtonText}>Explore Trending</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <FlashList
            data={watchlist}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            numColumns={numColumns}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: metrics.screenHorizontalPadding,
    paddingBottom: 16,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerCount: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: metrics.screenHorizontalPadding,
    paddingBottom: 60,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 12,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  exploreButton: {
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
