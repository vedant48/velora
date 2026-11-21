import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../state/AuthContext';
import { veloraApi, LibraryItem, UserStats, Review } from '../../api/velora';
import { LibraryCard } from '../../components/Library/LibraryCard';
import { ActionSheet } from '../../components/Library/ActionSheet';
import { checkForUpdate, downloadAndInstall } from '../../services/updates';

type TabKey = 'want' | 'watched' | 'series' | 'insights';
type SortKey = 'recent' | 'title' | 'rating';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'want', label: 'Want' },
  { key: 'watched', label: 'Watched' },
  { key: 'series', label: 'Series' },
  { key: 'insights', label: 'Insights' },
];

/** Must-style profile: name left/avatar right, rank + stats, tabs, 2-column grid. */
export const LibraryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, logout, apiReady } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [tab, setTab] = useState<TabKey>('want');
  const [sort, setSort] = useState<SortKey>('recent');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [allItems, setAllItems] = useState<LibraryItem[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateProgress, setUpdateProgress] = useState<number | null>(null);

  const handleUpdateCheck = useCallback(async () => {
    if (updateProgress !== null) return;
    try {
      const info = await checkForUpdate();
      if (!info) {
        Alert.alert('Update check failed', 'Could not reach the update server. Try again later.');
        return;
      }
      if (!info.isNewer) {
        Alert.alert('Velora is up to date', `You are on the latest version (${info.currentVersion}).`);
        return;
      }
      const notes = info.notes ? info.notes.slice(0, 300) : 'A new version is available.';
      Alert.alert(`Update available: v${info.latestVersion}`, notes, [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Download & install',
          onPress: () => {
            setUpdateProgress(0);
            void downloadAndInstall(info, setUpdateProgress).then((r) => {
              setUpdateProgress(null);
              if (!r.ok) {
                Alert.alert('Update failed', r.error ?? 'Something went wrong');
              } else {
                Alert.alert('Ready to install', 'Android will ask you to confirm the update.');
              }
            });
          },
        },
      ]);
    } catch {
      Alert.alert('Update check failed', 'Could not reach the update server. Try again later.');
    }
  }, [updateProgress]);

  useEffect(() => {
    if (!user) return;
    veloraApi.getUser(user.username).then(({ stats }) => setStats(stats)).catch(() => undefined);
    veloraApi.getLibrary().then(({ items }) => setAllItems(items)).catch(() => undefined);
    veloraApi.getMyReviews().then(({ reviews }) => setMyReviews(reviews)).catch(() => undefined);
  }, [user]);

  useEffect(() => {
    if (!user || tab === 'insights') return;
    let cancelled = false;
    setLoading(true);
    const mediaType = tab === 'series' ? 'tv' : undefined;
    const status = tab === 'series' ? undefined : tab;
    veloraApi
      .getLibrary(status, mediaType)
      .then(({ items }) => {
        if (!cancelled) setItems(items);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, tab]);

  const sortedItems = useMemo(() => {
    const list = [...items];
    if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'rating')
      list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    else list.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
    return list;
  }, [items, sort]);

  const openItem = useCallback(
    (item: LibraryItem) => {
      navigation.navigate('Details', {
        item: {
          id: item.tmdb_id,
          media_type: item.media_type,
          title: item.title,
          overview: '',
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          vote_average: 0,
          release_date: item.release_date ?? undefined,
        },
      });
    },
    [navigation],
  );

  const removeItem = useCallback((item: LibraryItem) => {
    Alert.alert('Remove from list?', item.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await veloraApi.removeItem(item.media_type, item.tmdb_id);
            setItems((prev) => prev.filter((i) => i.id !== item.id));
            setAllItems((prev) => prev.filter((i) => i.id !== item.id));
          } catch {
            // keep item
          }
        },
      },
    ]);
  }, []);

  const shareProfile = useCallback(() => {
    if (!user) return;
    Share.share({ message: `Follow me on Velora: @${user.username}` }).catch(() => undefined);
  }, [user]);

  const keyExtractor = useCallback((i: LibraryItem) => i.id, []);
  const renderItem = useCallback(
    ({ item }: { item: LibraryItem }) => (
      <View style={styles.gridCell}>
        <LibraryCard item={item} onPress={openItem} onLongPress={removeItem} />
      </View>
    ),
    [openItem, removeItem],
  );

  const insights = useMemo(() => {
    if (tab !== 'insights') return null;
    const watchedMovies = allItems.filter((i) => i.media_type === 'movie' && i.status === 'watched');
    const series = allItems.filter((i) => i.media_type === 'tv');
    const episodes = series.reduce((sum, i) => sum + i.episodes_watched, 0);
    const rated = myReviews.filter((r) => r.rating != null);
    const avg = rated.length
      ? (rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length).toFixed(1)
      : null;
    const dist = Array.from({ length: 11 }, (_, v) => rated.filter((r) => r.rating === v).length);
    const maxDist = Math.max(1, ...dist);
    return { watchedMovies: watchedMovies.length, series: series.length, episodes, avg, dist, maxDist, ratedCount: rated.length };
  }, [tab, allItems, myReviews]);

  const header = useMemo(
    () => (
      <View style={styles.header}>
        {/* Name left, avatar right */}
        <View style={styles.identityRow}>
          <View style={styles.identityText}>
            <Text style={styles.name}>{user?.displayName}</Text>
            <Text style={styles.username}>@{user?.username}</Text>
            {!!user?.bio && <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text>}
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.displayName?.[0] ?? '?').toUpperCase()}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <Stat label="Rank" value={stats ? `#${stats.rank}` : undefined} />
          <Stat label="Want" value={stats?.want} />
          <Stat label="Watched" value={stats?.watched} />
          <Stat label="Series" value={stats?.series} />
        </View>

        <View style={styles.actionsRow}>
          <Pressable onPress={shareProfile} style={styles.iconAction} accessibilityLabel="Share profile">
            <Ionicons name="share-social-outline" size={17} color={colors.textPrimary} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Activity')} style={styles.iconAction} accessibilityLabel="Activity">
            <Ionicons name="pulse-outline" size={17} color={colors.textPrimary} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Account')} style={styles.iconAction} accessibilityLabel="Settings">
            <Ionicons name="settings-outline" size={17} color={colors.textPrimary} />
          </Pressable>
          <Pressable onPress={handleUpdateCheck} style={styles.iconAction} accessibilityLabel="Check for update">
            {updateProgress !== null ? (
              <Text style={styles.updatePct}>{Math.round(updateProgress * 100)}%</Text>
            ) : (
              <Ionicons name="cloud-download-outline" size={17} color={colors.textPrimary} />
            )}
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert('Log out?', undefined, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log out', style: 'destructive', onPress: () => void logout() },
              ])
            }
            style={styles.iconAction}
            accessibilityLabel="Log out"
          >
            <Ionicons name="log-out-outline" size={17} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.divider} />

        {/* Tabs + filter */}
        <View style={styles.tabsRow}>
          <View style={styles.tabsGroup}>
            {TABS.map((t) => (
              <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
                <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
          {tab !== 'insights' && (
            <Pressable onPress={() => setSortSheetVisible(true)} style={styles.filterButton} accessibilityLabel="Sort">
              <Ionicons name="funnel-outline" size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>
    ),
    [user, stats, tab, shareProfile, logout, handleUpdateCheck, updateProgress, navigation],
  );

  if (!apiReady || !user) {
    return (
      <View style={styles.emptyRoot}>
        <Ionicons name="person-circle-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Your library lives here</Text>
        <Text style={styles.emptyText}>
          {apiReady
            ? 'Log in to track watched titles, ratings and episode progress across devices.'
            : 'Backend not configured yet. Set EXPO_PUBLIC_API_URL to enable accounts.'}
        </Text>
        {apiReady && (
          <Pressable style={styles.loginButton} onPress={() => navigation.navigate('Auth')}>
            <Text style={styles.loginButtonText}>Log in / Sign up</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlashList
        data={tab === 'insights' ? [] : sortedItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={2}
        ListHeaderComponent={
          <View>
            {header}
            {tab === 'insights' && insights && (
              <View style={styles.insights}>
                <View style={styles.insightRow}>
                  <InsightCell label="Movies watched" value={insights.watchedMovies} />
                  <InsightCell label="Series tracked" value={insights.series} />
                  <InsightCell label="Episodes" value={insights.episodes} />
                </View>
                <View style={styles.insightBlock}>
                  <Text style={styles.insightHeading}>Average rating</Text>
                  <Text style={styles.insightBig}>{insights.avg ?? '-'}</Text>
                  <Text style={styles.insightSub}>{insights.ratedCount} rated titles & seasons</Text>
                </View>
                <View style={styles.insightBlock}>
                  <Text style={styles.insightHeading}>Rating distribution</Text>
                  <View style={styles.distRow}>
                    {insights.dist.map((count, v) => (
                      <View key={v} style={styles.distCol}>
                        <View style={styles.distBarTrack}>
                          <View
                            style={[
                              styles.distBarFill,
                              { height: Math.max((count / insights.maxDist) * 72, count > 0 ? 4 : 1) },
                            ]}
                          />
                        </View>
                        <Text style={styles.distLabel}>{v}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          tab === 'insights' ? null : loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
          ) : (
            <Text style={styles.emptyText}>Nothing here yet. Rate and track from any title page.</Text>
          )
        }
      />

      <ActionSheet
        visible={sortSheetVisible}
        onClose={() => setSortSheetVisible(false)}
        showCancel={false}
        options={[
          { label: 'Recently updated', onPress: () => setSort('recent') },
          { label: 'Title A-Z', onPress: () => setSort('title') },
          { label: 'Highest rated', onPress: () => setSort('rating') },
        ]}
      />
    </View>
  );
};

const Stat = memo(function Stat({ label, value }: { label: string; value?: number | string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value ?? '-'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
});

const InsightCell = memo(function InsightCell({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.insightCell}>
      <Text style={styles.insightCellValue}>{value}</Text>
      <Text style={styles.insightCellLabel}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: 12, paddingTop: 60, paddingBottom: 110 },
  gridCell: { flex: 1 / 2, padding: 5 },
  header: { gap: 12, paddingBottom: 14, paddingHorizontal: 4 },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  identityText: { flex: 1, gap: 2 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.trackBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 26, fontWeight: '900', color: '#fff' },
  name: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  username: { fontSize: 13, color: colors.textTertiary },
  bio: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 8,
    marginTop: 2,
  },
  stat: { alignItems: 'flex-start' },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  iconAction: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updatePct: { fontSize: 10, fontWeight: '800', color: colors.textPrimary },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginTop: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabsGroup: { flexDirection: 'row', gap: 6, flexShrink: 1 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.trackBlue },
  tabText: { fontSize: 12, fontWeight: '700', color: colors.textTertiary },
  tabTextActive: { color: '#fff' },
  filterButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  insights: { gap: 18, paddingTop: 6, paddingBottom: 20 },
  insightRow: { flexDirection: 'row', gap: 10 },
  insightCell: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  insightCellValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  insightCellLabel: { fontSize: 11, color: colors.textTertiary, marginTop: 3, fontWeight: '600' },
  insightBlock: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  insightHeading: { fontSize: 13, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.4 },
  insightBig: { fontSize: 34, fontWeight: '900', color: colors.textPrimary, marginTop: 6 },
  insightSub: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  distRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginTop: 12 },
  distCol: { flex: 1, alignItems: 'center', gap: 4 },
  distBarTrack: { height: 76, justifyContent: 'flex-end' },
  distBarFill: {
    width: '100%',
    borderRadius: 3,
    backgroundColor: colors.trackBlue,
  },
  distLabel: { fontSize: 10, color: colors.textTertiary, fontWeight: '700' },
  emptyRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 32,
    backgroundColor: colors.background,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  emptyText: { fontSize: 13, color: colors.textTertiary, textAlign: 'center', lineHeight: 19, paddingHorizontal: 16, marginTop: 24 },
  loginButton: { marginTop: 8, backgroundColor: colors.trackBlue, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  loginButtonText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
