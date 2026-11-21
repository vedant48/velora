import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LibraryItem, Review, UserStats, veloraApi } from '../../api/velora';
import { AppButton } from '../../components/common/AppButton';
import { AppLoader } from '../../components/common/AppLoader';
import { ActionSheet } from '../../components/Library/ActionSheet';
import { LibraryCard } from '../../components/Library/LibraryCard';
import { LibraryQuickAction } from '../../components/Library/LibraryQuickAction';
import { checkForUpdate, downloadAndInstall } from '../../services/updates';
import { useAuth } from '../../state/AuthContext';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';

type TabKey = 'want' | 'watched' | 'series' | 'insights';
type SortKey = 'recent' | 'release' | 'title' | 'rating';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'want', label: 'Want' },
  { key: 'watched', label: 'Watched' },
  { key: 'series', label: 'Series' },
  { key: 'insights', label: 'Insights' },
];

/** Must-style profile: name left/avatar right, rank + stats, tabs, 2-column grid. */
export const LibraryScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState({ hideMovies: false, hideSeries: false, hideUnreleased: false });
  const [appliedSort, setAppliedSort] = useState<SortKey>('recent');
  const [menuVisible, setMenuVisible] = useState(false);
  const [quickItem, setQuickItem] = useState<LibraryItem | null>(null);
  const [hideMovies, setHideMovies] = useState(false);
  const [hideSeries, setHideSeries] = useState(false);
  const [hideUnreleased, setHideUnreleased] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user, logout, apiReady } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [tab, setTab] = useState<TabKey>('want');
  const [sort, setSort] = useState<SortKey>('recent');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [allItems, setAllItems] = useState<LibraryItem[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [loadError, setLoadError] = useState(false);
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

  useFocusEffect(useCallback(() => {
    if (!user) return;
    let active = true;
    veloraApi.getUser(user.username).then(({ stats }) => { if (active) setStats(stats); }).catch(() => undefined);
    veloraApi.getLibrary().then(({ items }) => { if (active) setAllItems(items); }).catch(() => undefined);
    veloraApi.getMyReviews().then(({ reviews }) => { if (active) setMyReviews(reviews); }).catch(() => undefined);
    return () => { active = false; };
  }, [user, refreshKey]));

  useFocusEffect(useCallback(() => {
    if (!user || tab === 'insights') return;
    let active = true;
    setLoading(true);
    setLoadError(false);
    const mediaType = tab === 'series' ? 'tv' : undefined;
    const status = tab === 'series' ? undefined : tab;
    veloraApi.getLibrary(status, mediaType).then(({ items }) => { if (active) setItems(items); })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, tab, refreshKey]));

  const sortedItems = useMemo(() => {
    const { hideMovies, hideSeries, hideUnreleased } = appliedFilters;
    const sort = appliedSort;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const list = items.filter(i => !(hideMovies && i.media_type === 'movie') && !(hideSeries && i.media_type === 'tv') && !(hideUnreleased && i.release_date && i.release_date > today));
    if (sort === 'release') list.sort((a, b) => (b.release_date ?? '').localeCompare(a.release_date ?? ''));
    else if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'rating')
      list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    else list.sort((a, b) => b.added_at.localeCompare(a.added_at));
    return list;
  }, [items, appliedSort, appliedFilters]);

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
  }, [user, refreshKey]);

  const keyExtractor = useCallback((i: LibraryItem) => i.id, []);
  const renderItem = useCallback(
    ({ item }: { item: LibraryItem }) => (
      <View style={styles.gridCell}>
        <LibraryCard item={item} onPress={openItem} onLongPress={i => i.media_type === 'movie' && i.status === 'want' ? setQuickItem(i) : removeItem(i)} />
      </View>
    ),
    [openItem, removeItem, styles],
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
            <Pressable onPress={() => {
              setHideMovies(appliedFilters.hideMovies); setHideSeries(appliedFilters.hideSeries); setHideUnreleased(appliedFilters.hideUnreleased); setSort(appliedSort);
              setSortSheetVisible(v => !v);
            }} style={styles.filterButton} accessibilityLabel="Filter and sort" accessibilityState={{ expanded: sortSheetVisible }}>
              <Ionicons name="funnel-outline" size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>
    ),
    [user, stats, tab, shareProfile, logout, handleUpdateCheck, updateProgress, navigation, appliedFilters, appliedSort, sortSheetVisible, colors, styles],
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
          <AppButton title="Log in / Sign up" style={{ marginTop: 8 }} onPress={() => navigation.navigate('Auth')} />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topRow}>
        <Pressable onPress={() => navigation.navigate('Account')} style={styles.topButton} accessibilityLabel="Settings"><Ionicons name="settings-sharp" size={16} color={colors.textTertiary} /></Pressable>
        <Text style={styles.brand}>VELORA</Text>
        <Pressable onPress={() => setMenuVisible(true)} style={styles.topButton} accessibilityLabel="More profile actions"><Ionicons name="ellipsis-vertical" size={18} color={colors.textTertiary} /></Pressable>
      </View>
      <FlashList
        maintainVisibleContentPosition={{ disabled: true }}
        data={tab === 'insights' || loading || loadError ? [] : sortedItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={2}
        scrollEnabled={!sortSheetVisible}
        ListHeaderComponent={
          <View onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}>
            {header}
            {sortSheetVisible && tab !== 'insights' && <View style={styles.filters}>
              <View style={styles.filterChips}>
                {[
                  { label: 'Hide Movies', selected: hideMovies, toggle: () => setHideMovies(v => !v) },
                  { label: 'Hide Series', selected: hideSeries, toggle: () => setHideSeries(v => !v) },
                  { label: 'Hide Unreleased', selected: hideUnreleased, toggle: () => setHideUnreleased(v => !v) },
                ].map(c => <Pressable key={c.label} accessibilityLabel={c.label} onPress={c.toggle} accessibilityRole="checkbox" accessibilityState={{ checked: c.selected }} style={[styles.filterChip, c.selected && styles.filterChipSelected]}><Text style={styles.tabText}>{c.label}</Text></Pressable>)}
              </View>
              <View style={styles.filterChips}>{([
                ['recent', 'Date added'], ['release', 'Release date'], ['title', 'Title A-Z'], ['rating', 'Highest rated'],
              ] as const).map(([key, label]) => <Pressable key={key} onPress={() => setSort(key)} accessibilityRole="radio" accessibilityState={{ selected: sort === key }} style={styles.filterChip}><Text style={[styles.tabText, sort === key && { color: colors.primary }]}>{label}</Text></Pressable>)}</View>
              <Pressable accessibilityLabel="Apply filters" onPress={() => { setAppliedFilters({ hideMovies, hideSeries, hideUnreleased }); setAppliedSort(sort); setSortSheetVisible(false); }} style={styles.apply}><Text style={styles.tabText}>Apply</Text></Pressable>
            </View>}
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
            <AppLoader style={{ marginTop: 32 }} />
          ) : loadError ? (
            <Pressable onPress={() => setRefreshKey(k => k + 1)} accessibilityRole="button"><Text style={styles.emptyText}>Could not load your library. Tap to retry.</Text></Pressable>
          ) : (
            <Text style={styles.emptyText}>Nothing here yet. Rate and track from any title page.</Text>
          )
        }
      />

      {sortSheetVisible && <Pressable accessibilityLabel="Dismiss filters without applying" onPress={() => setSortSheetVisible(false)} style={[styles.filterScrim, { top: insets.top + 34 + 8 + headerHeight }]} />}
      <ActionSheet visible={menuVisible} onClose={() => setMenuVisible(false)} options={[
        { label: 'Share profile', onPress: shareProfile },
        { label: 'Activity', onPress: () => navigation.navigate('Activity') },
        { label: updateProgress === null ? 'Check for update' : `Downloading ${Math.round(updateProgress * 100)}%`, onPress: handleUpdateCheck },
        { label: 'Log out', onPress: () => Alert.alert('Log out?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: () => void logout() }]) },
      ]} />
      {quickItem && <LibraryQuickAction item={quickItem} onClose={() => setQuickItem(null)} onChanged={() => setRefreshKey(k => k + 1)} />}

    </View>
  );
};

const Stat = memo(function Stat({ label, value }: { label: string; value?: number | string }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value ?? '-'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
});

const InsightCell = memo(function InsightCell({ label, value }: { label: string; value: number }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.insightCell}>
      <Text style={styles.insightCellValue}>{value}</Text>
      <Text style={styles.insightCellLabel}>{label}</Text>
    </View>
  );
});

const createStyles = (colors: AppColors) => StyleSheet.create({
  filterScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  topButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 9, letterSpacing: 2, color: colors.primary, fontWeight: '700' },
  filters: { padding: 12, gap: 10 },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface },
  filterChipSelected: { backgroundColor: colors.surfaceLight },
  apply: { alignSelf: 'center', paddingHorizontal: 30, paddingVertical: 9, borderRadius: 20, backgroundColor: colors.surface },
  root: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 110 },
  gridCell: { flex: 1 / 2, padding: 1 },
  header: { gap: 12, paddingBottom: 14, paddingHorizontal: 4 },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  identityText: { flex: 1, gap: 2 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.trackBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 26, fontWeight: '900', color: '#fff' },
  name: { fontSize: 21, fontWeight: '700', color: colors.textPrimary },
  username: { fontSize: 13, color: colors.textTertiary },
  bio: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  statsRow: {
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 8,
    marginTop: 2,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
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
  tabsGroup: { flexDirection: 'row', gap: 2, flexShrink: 1 },
  tab: { paddingHorizontal: 8, paddingVertical: 8, borderRadius: 18, backgroundColor: 'transparent' },
  tabActive: { backgroundColor: colors.surfaceLight },
  tabText: { fontSize: 11, fontWeight: '700', color: colors.textTertiary },
  tabTextActive: { color: colors.textPrimary },
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
});
