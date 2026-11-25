import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { CachedImage as Image } from '../../experience/CachedImage';
import React from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityEvent, veloraApi } from '../../api/velora';
import { Avatar } from '../../components/Avatar';
import { AppLoader } from '../../components/common/AppLoader';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { RootStackParamList } from '../../navigation/types';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { ui } from '../../theme/ui';
import { getImageUrl } from '../../utils/image';
import { RowsSkeleton } from '../../components/Skeleton/ContentSkeletons';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function describe(e: ActivityEvent): string {
  const bits: string[] = [];
  if (e.kind === 'review') {
    bits.push('reviewed');
  } else if (e.status === 'watched') {
    bits.push('watched');
  } else if (e.status === 'watching') {
    bits.push('is watching');
  } else {
    bits.push('wants to watch');
  }
  if (e.rating != null) bits.push(`and rated it ${e.rating}/10`);
  return bits.join(' ');
}

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Must-style friends feed: what people you follow watched, rated and reviewed. */
export const ActivityScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['activity'],
    queryFn: () => veloraApi.activity(),
    staleTime: 60 * 1000,
  });

  const feed = data?.feed ?? [];

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={{paddingHorizontal: ui.space.lg}}><ScreenHeader title="Activity" onBack={() => navigation.goBack()} /></View>

      {isLoading ? (
        <RowsSkeleton />
      ) : isError ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Could not load the feed.</Text>
          <Pressable onPress={() => refetch()} style={styles.retry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : feed.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            Nothing yet. Follow people from Search to see what they watch and rate.
          </Text>
        </View>
      ) : (
        <FlashList
          data={feed}
          keyExtractor={(e, i) => `${e.username}-${e.media_type}-${e.tmdb_id}-${i}`}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.textPrimary} colors={[colors.textPrimary]} progressBackgroundColor={colors.appleCard} />}
          contentContainerStyle={styles.feedCard}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListFooterComponent={
            <Text style={styles.explainer}>What people you follow watched, rated and reviewed.</Text>
          }
          renderItem={({ item }) => {
            const name = item.display_name || item.username;
            return (
            <Pressable
              style={styles.row}
              onPress={() => navigation.navigate('UserProfile', { username: item.username })}
            >
              {/* Feed events carry no avatarAt, so this renders the gallery gradient
                  fallback; the shared component swaps in a real photo the moment one exists. */}
              <Avatar user={{ username: item.username, displayName: item.display_name, avatarAt: null }} size={38} letters={2} />
              <View style={styles.rowText}>
                <Text style={styles.line} numberOfLines={2}>
                  <Text style={styles.who}>{name} </Text>
                  {describe(item)}{' '}
                  <Text style={styles.what}>{item.title}</Text>
                </Text>
                {!!item.body && (
                  <Text style={styles.body} numberOfLines={2}>
                    {item.body}
                  </Text>
                )}
                <Text style={styles.when}>{timeAgo(item.updated_at)}</Text>
              </View>
              <Image
                source={{ uri: getImageUrl(item.poster_path, 'thumbnail') ?? undefined }}
                style={styles.poster}
                contentFit="cover"
                transition={120}
              />
            </Pressable>
            );
          }}
        />
      )}
    </View>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: ui.space.md, paddingHorizontal: ui.space.lg, paddingBottom: ui.space.md },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: ui.space.md, paddingHorizontal: ui.space.xxl },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  retry: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.surface },
  retryText: { color: colors.textPrimary, fontWeight: '700', fontSize: 13 },
  feedCard: {
    marginHorizontal: ui.space.lg,
    marginBottom: 30,
    backgroundColor: colors.appleCard,
    borderRadius: 14,
    overflow: 'hidden',
  },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.appleSeparator, marginLeft: 62 },
  explainer: { textAlign: 'center', color: colors.appleText2, fontSize: 13, paddingVertical: 18, backgroundColor: colors.background },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.appleBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ui.space.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  poster: { width: 38, height: 56, borderRadius: 6 },
  rowText: { flex: 1, gap: 3 },
  line: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  who: { fontWeight: '800', color: colors.textPrimary },
  what: { fontWeight: '700', color: colors.textPrimary },
  body: { fontSize: ui.type.label, color: colors.textSecondary, fontStyle: 'italic' },
  when: { fontSize: ui.type.caption, color: colors.textMuted },
});
