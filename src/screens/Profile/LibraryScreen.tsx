import { ratingDistribution } from '../../experience/ratingDistribution';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Image, Modal, Pressable, RefreshControl, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { ContentPager } from '../../experience/ContentPager';
import { endedCompleteLast, itemInTab, LibraryTab } from './libraryTabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LibraryItem, Review, UserStats, veloraApi } from '../../api/velora';
import { AppButton } from '../../components/common/AppButton';
import { AppLoader } from '../../components/common/AppLoader';
import { Avatar } from '../../components/Avatar';
import { ActionSheet } from '../../components/Library/ActionSheet';
import { LibraryCard } from '../../components/Library/LibraryCard';
import { LibraryQuickAction } from '../../components/Library/LibraryQuickAction';
import { isEndedComplete, seriesProgress } from '../../components/Library/seriesProgress';
import { CachedImage } from '../../experience/CachedImage';
import { useQueries } from '@tanstack/react-query';
import { getTVDetails } from '../../api/tv';
import { GC_TIME, STALE_TIME, useTVDetailsQuery } from '../../api/queries';
import { checkForUpdate, downloadAndInstall } from '../../services/updates';
import { useAuth } from '../../state/AuthContext';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { ui } from '../../theme/ui';

type TabKey = LibraryTab;
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
  const [appliedFilters, setAppliedFilters] = useState({ hideMovies: false, hideSeries: false, hideUnreleased: false });
  const [appliedSort, setAppliedSort] = useState<SortKey>('recent');
  const [menuVisible, setMenuVisible] = useState(false);
  const [quickItem, setQuickItem] = useState<LibraryItem | null>(null);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [hideMovies, setHideMovies] = useState(false);
  const [hideSeries, setHideSeries] = useState(false);
  const [hideUnreleased, setHideUnreleased] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user, logout, apiReady, refresh: refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const refreshProfile = useCallback(async () => {
    if (!user || refreshing) return;
    setRefreshing(true);
    const results = await Promise.allSettled([refreshUser(), veloraApi.getUser(user.username), veloraApi.getLibrary(), veloraApi.getMyReviews()]);
    const profile = results[1], library = results[2], reviews = results[3];
    if (profile.status === 'fulfilled') setStats(profile.value.stats);
    if (library.status === 'fulfilled') { setAllItems(library.value.items); setItems(library.value.items); }
    if (reviews.status === 'fulfilled') setMyReviews(reviews.value.reviews);
    setRefreshing(false);
    if (results.some(r => r.status === 'rejected')) Alert.alert('Refresh incomplete', 'Some profile data could not be refreshed. Pull down to retry.');
  }, [user, refreshing, refreshUser]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [tab, setTab] = useState<TabKey>('want');
  const [sort, setSort] = useState<SortKey>('recent');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  // Collapsing overlay header (owner reference video, 25 Nov): initial order is
  // app-icon bar, then profile details, then the tab row. On scroll the icon bar
  // AND the profile details scroll away; only tabs + filter pin at the top.
  const scrollY = useRef(new Animated.Value(0)).current;
  const pageOffsets = useRef<Partial<Record<TabKey, number>>>({});
  const [collapseH, setCollapseH] = useState(0);
  const [pinnedH, setPinnedH] = useState(0);
  const collapseRange = Math.max(collapseH, 1);
  // Clip-window collapse (owner report, 25 Nov): the icon bar + profile live in a window
  // whose height animates collapseH -> 0 with overflow hidden, bottom-anchored so content
  // exits upward. A static opaque spacer owns the status-bar strip, so scrolled-away content
  // can never render behind the status bar, and the window clamps to exactly 0 so no
  // measurement drift can leave a gap above the pinned tabs.
  const clipH = useMemo(
    () => scrollY.interpolate({ inputRange: [0, collapseRange], outputRange: [collapseH, 0], extrapolate: 'clamp' }),
    [scrollY, collapseRange, collapseH],
  );
  const syncScrollTo = useCallback((key: TabKey) => { scrollY.setValue(pageOffsets.current[key] ?? 0); }, [scrollY]);
  const selectTab = useCallback((next: TabKey) => { setSortSheetVisible(false); syncScrollTo(next); setTab(next); }, [syncScrollTo]);
  const onPageChange = useCallback((index: number) => { syncScrollTo(TABS[index].key); setTab(TABS[index].key); }, [syncScrollTo]);

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [allItems, setAllItems] = useState<LibraryItem[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const loadedUsername = useRef<string | null>(null);
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
    if (!user || !apiReady) return;
    let active = true;
    const hadContent = loadedUsername.current === user.username;
    setLoading(!hadContent);
    setLoadError(false);
    if (!hadContent) { setItems([]); setAllItems([]); setStats(null); setMyReviews([]); }
    veloraApi.getUser(user.username).then(({ stats }) => { if (active) setStats(stats); }).catch(() => undefined);
    veloraApi.getMyReviews().then(({ reviews }) => { if (active) setMyReviews(reviews); }).catch(() => undefined);
    // Focus refresh must not unmount cached posters or discard each page's scroll.
    veloraApi.getLibrary().then(({ items }) => {
      if (active) { setItems(items); setAllItems(items); loadedUsername.current = user.username; }
    }).catch(() => { if (active && !hadContent) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.username, apiReady, refreshKey]));

  // Ended+fully-watched series sink to the bottom of the Series tab (owner rule, 25 Nov).
  // Only a series with every saved episode watched needs TMDB's status, same as the card tick;
  // the query key matches LibraryCard's, so card fetches warm this cache and vice versa.
  const endedCandidates = useMemo(
    () => items.filter(i => {
      const prog = seriesProgress(i);
      return itemInTab(i, 'series') && prog !== null && prog.left === 0;
    }),
    [items],
  );
  const endedDetailResults = useQueries({
    queries: endedCandidates.map(i => ({
      queryKey: ['tv_details', i.tmdb_id],
      queryFn: ({ signal }: { signal: AbortSignal }) => getTVDetails(i.tmdb_id, signal),
      staleTime: STALE_TIME,
      gcTime: GC_TIME,
    })),
  });
  const endedCompleteIds = useMemo(() => {
    const ids = new Set<number>();
    endedCandidates.forEach((item, index) => {
      if (isEndedComplete(seriesProgress(item), endedDetailResults[index]?.data)) ids.add(item.tmdb_id);
    });
    return ids;
  }, [endedCandidates, endedDetailResults]);

  const itemsByTab = useMemo(() => {
    const { hideMovies, hideSeries, hideUnreleased } = appliedFilters;
    const sort = appliedSort;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const forTab = (pageTab: TabKey) => {
    const scoped = items.filter(i => itemInTab(i, pageTab));
    const list = scoped.filter(i => !(hideMovies && i.media_type === 'movie') && !(hideSeries && i.media_type === 'tv') && !(hideUnreleased && i.release_date && i.release_date > today));
    if (sort === 'release') list.sort((a, b) => (b.release_date ?? '').localeCompare(a.release_date ?? ''));
    else if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'rating')
      list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    else list.sort((a, b) => b.added_at.localeCompare(a.added_at));
    if (pageTab === 'series') return endedCompleteLast(list, i => endedCompleteIds.has(i.tmdb_id));
    return list; };
    return { want: forTab('want'), watched: forTab('watched'), series: forTab('series'), insights: [] };
  }, [items, appliedSort, appliedFilters, endedCompleteIds]);

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
  }, [user?.username, refreshKey]);

  const keyExtractor = useCallback((i: LibraryItem) => i.id, []);
  const renderItem = useCallback(
    ({ item }: { item: LibraryItem }) => (
      <View style={styles.gridCell}>
        <LibraryCard item={item} onPress={openItem} onLongPress={i => i.media_type === 'movie' && i.status === 'want' ? setQuickItem(i) : removeItem(i)} />
      </View>
    ),
    [openItem, removeItem, styles],
  );

  // Apple redesign: the Series tab is a grouped list card with per-series progress bars.
  const renderSeriesItem = useCallback(
    ({ item, index }: { item: LibraryItem; index: number }) => (
      <SeriesRow
        item={item}
        first={index === 0}
        last={index === itemsByTab.series.length - 1}
        onPress={openItem}
        onLongPress={i => setQuickItem(i)}
      />
    ),
    [openItem, itemsByTab.series.length],
  );
  const renderSeriesSep = useCallback(() => <View style={styles.seriesSep} />, [styles]);

  const insights = useMemo(() => {
    const watchedMovies = allItems.filter((i) => i.media_type === 'movie' && i.status === 'watched');
    const series = allItems.filter((i) => itemInTab(i, 'series'));
    const episodes = series.reduce((sum, i) => sum + i.episodes_watched, 0);
    const rated = myReviews.filter((r) => r.rating != null);
    const avg = rated.length
      ? (rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length).toFixed(1)
      : null;
    const dist = ratingDistribution(rated.map(r => r.rating));
    const maxDist = Math.max(1, ...dist);
    // "This year" counts real rating events dated this year (review created_at).
    const year = new Date().getFullYear();
    const thisYear = rated.filter((r) => new Date(r.created_at).getFullYear() === year).length;
    // Recent activity rows come from actual ratings (title resolved from the library).
    const activity = rated
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 3)
      .map((r) => {
        const item = allItems.find((i) => i.media_type === r.media_type && i.tmdb_id === r.tmdb_id);
        return {
          id: r.id,
          text: `Rated ${item?.title ?? 'a title'}${r.season_number ? ` S${r.season_number}` : ''}`,
          sub: `${r.rating} / 10 · ${timeAgo(r.created_at)}`,
        };
      });
    return { watchedMovies: watchedMovies.length, series: series.length, episodes, avg, dist, maxDist, ratedCount: rated.length, thisYear, activity };
  }, [allItems, myReviews]);

  // Owner rule (25 Nov, with Must reference video): profile details scroll away with the grid;
  // only the Want/Watched/Series/Insights tabs and the filter icon stay pinned at the top.
  // So the identity/stats block lives in each page's list header and the tab row stays fixed.
  const memberSince = useMemo(() => {
    if (!user?.createdAt) return '';
    const d = new Date(user.createdAt);
    if (isNaN(d.getTime())) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }, [user?.createdAt]);

  // Apple redesign: iOS large-title identity row, then one grouped stats card.
  const profileHeader = useMemo(
    () => (
      <View style={styles.header}>
        <View style={styles.identityRow}>
          <View style={styles.identityText}>
            <Text style={styles.name}>{user?.displayName}</Text>
            <Text style={styles.handle}>@{user?.username}{memberSince ? ` · Member since ${memberSince}` : ''}</Text>
            {!!user?.bio && <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text>}
          </View>
          <Pressable accessibilityLabel="View profile photo" accessibilityRole="imagebutton" onPress={() => setPhotoViewerVisible(true)}>
            <Avatar user={user} size={62} />
          </Pressable>
        </View>

        <View style={styles.statCard}>
          <Stat label="Place" value={stats ? `#${stats.rank}` : undefined} />
          <View style={styles.statSep} />
          <Stat label="Want" value={stats?.want} />
          <View style={styles.statSep} />
          <Stat label="Watched" value={stats?.watched} />
          <View style={styles.statSep} />
          <Stat label="Series" value={stats?.series} />
        </View>
      </View>
    ),
    [user, stats, memberSince, colors, styles],
  );

  // Apple redesign: iOS segmented control instead of tab pills, filter stays a circle button.
  const tabsHeader = useMemo(
    () => (
      <View style={styles.header}>
        <View style={styles.segRow}>
          <View style={styles.seg}>
            {TABS.map((t) => (
              <Pressable key={t.key} testID={`library-tab-${t.key}`} accessibilityRole="tab" accessibilityState={{ selected: tab === t.key }} accessibilityLabel={t.label} onPress={() => selectTab(t.key)} style={[styles.segItem, tab === t.key && styles.segItemActive]}>
                <Text style={[styles.segText, tab === t.key && styles.segTextActive]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
          {tab !== 'insights' && (
            <Pressable onPress={() => {
              setHideMovies(appliedFilters.hideMovies); setHideSeries(appliedFilters.hideSeries); setHideUnreleased(appliedFilters.hideUnreleased); setSort(appliedSort);
              setSortSheetVisible(v => !v);
            }} style={styles.circleButton} accessibilityLabel="Filter and sort" accessibilityState={{ expanded: sortSheetVisible }}>
              <Ionicons name="options-outline" size={17} color={colors.appleText} />
            </Pressable>
          )}
        </View>
      </View>
    ),
    [tab, selectTab, appliedFilters, appliedSort, sortSheetVisible, colors, styles],
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
          <AppButton title="Log in / Sign up" style={{ marginTop: ui.space.sm }} onPress={() => navigation.navigate('Auth')} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={{ flex: 1 }}>
      <ContentPager index={TABS.findIndex(t => t.key === tab)} onIndexChange={onPageChange} enabled={!sortSheetVisible && !menuVisible && !quickItem}>
          {TABS.map(({ key: pageTab }) => <View key={pageTab} style={{ flex: 1 }}>
            <FlashList
              testID={`library-page-${pageTab}`}
              maintainVisibleContentPosition={{ disabled: true }}
              data={pageTab === 'insights' || loading || loadError ? [] : itemsByTab[pageTab]}
              keyExtractor={keyExtractor} renderItem={pageTab === 'series' ? renderSeriesItem : renderItem} numColumns={pageTab === 'series' ? 1 : 2}
              ItemSeparatorComponent={pageTab === 'series' ? renderSeriesSep : undefined}
              drawDistance={280}
              onScroll={pageTab === tab
                ? Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false, listener: (e: any) => { pageOffsets.current[pageTab] = e.nativeEvent.contentOffset.y; } })
                : (e: any) => { pageOffsets.current[pageTab] = e.nativeEvent.contentOffset.y; }}
              scrollEventThrottle={16}
              scrollEnabled={!sortSheetVisible}
              refreshControl={<RefreshControl refreshing={refreshing && tab === pageTab} onRefresh={refreshProfile} colors={['#000000']} tintColor="#000000" progressBackgroundColor="#FFFFFF" progressViewOffset={insets.top + collapseH + pinnedH} />}
              ListHeaderComponent={pageTab === 'insights' && insights ? (
              <View style={styles.insights}>
                <View style={styles.insightGrid}>
                  <View style={styles.insightTile}>
                    <Text style={styles.insightTileLabel}>This year</Text>
                    <Text style={styles.insightTileValue}>{insights.thisYear}</Text>
                    <Text style={styles.insightTileSub}>titles rated</Text>
                  </View>
                  <View style={styles.insightTile}>
                    <Text style={styles.insightTileLabel}>Movies watched</Text>
                    <Text style={styles.insightTileValue}>{insights.watchedMovies}</Text>
                  </View>
                  <View style={styles.insightTile}>
                    <Text style={styles.insightTileLabel}>Series tracked</Text>
                    <Text style={styles.insightTileValue}>{insights.series}</Text>
                  </View>
                  <View style={styles.insightTile}>
                    <Text style={styles.insightTileLabel}>Average rating</Text>
                    <Text style={styles.insightTileValue}>{insights.avg ?? '-'}</Text>
                    <Text style={styles.insightTileSub}>{insights.ratedCount} rated titles & seasons</Text>
                  </View>
                </View>
                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Your ratings</Text>
                  <View style={styles.chart}>
                    {insights.dist.map((count, v) => (
                      <View key={v} style={styles.chartCol}>
                        <View style={[styles.chartBar, { height: Math.max((count / insights.maxDist) * 90, count > 0 ? 4 : 1) }, count === insights.maxDist && count > 0 && styles.chartBarPeak]} />
                        <Text style={styles.chartLabel}>{v + 1}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                {insights.activity.length > 0 && (
                  <View style={styles.chartCard}>
                    {insights.activity.map((a, i) => (
                      <View key={a.id} style={[styles.actRow, i < insights.activity.length - 1 && styles.actRowSep]}>
                        <Ionicons name="star" size={17} color={colors.appleAmber} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.actTitle}>{a.text}</Text>
                          <Text style={styles.actSub}>{a.sub}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : null}
              contentContainerStyle={[styles.listContent, { paddingTop: insets.top + collapseH + pinnedH + ui.component.libraryGrid.topPadding }]}
              ListEmptyComponent={pageTab === 'insights' ? null : loading ? <AppLoader style={{ marginTop: ui.space.xxl }} /> : loadError ? <Pressable onPress={() => setRefreshKey(k => k + 1)} accessibilityRole="button"><Text style={styles.emptyText}>Could not load your library. Tap to retry.</Text></Pressable> : <Text style={styles.emptyText}>Nothing here yet. Rate and track from any title page.</Text>}
            />
          </View>)}
      </ContentPager>
      </View>
      <Animated.View style={[styles.headerOverlay, { backgroundColor: colors.background }]}>
        <View style={{ height: insets.top }} />
        <Animated.View style={{ height: collapseH === 0 ? undefined : clipH, overflow: 'hidden', justifyContent: 'flex-end' }}>
          <View onLayout={(e) => setCollapseH(e.nativeEvent.layout.height)}>
      {/* Owner rule (25 Nov): no VELORA text; app icon only on the left, settings + overflow on the right. */}
            <View style={styles.topRow}>
              <Image source={require('../../../assets/icon.png')} style={styles.brandIcon} accessibilityLabel="Velora" />
              <View style={styles.topActions}>
                <Pressable onPress={() => navigation.navigate('Account')} style={styles.circleButton} accessibilityLabel="Settings"><Ionicons name="settings-outline" size={17} color={colors.appleText} /></Pressable>
                <Pressable onPress={() => setMenuVisible(true)} style={styles.circleButton} accessibilityLabel="More profile actions"><Ionicons name="ellipsis-horizontal" size={18} color={colors.appleText} /></Pressable>
              </View>
            </View>

            <View style={{ paddingHorizontal: ui.component.profileHeader.horizontalPadding }}>{profileHeader}</View>
          </View>
        </Animated.View>
          <View onLayout={(e) => setPinnedH(e.nativeEvent.layout.height)}>
            <View style={{ paddingHorizontal: ui.component.libraryTabs.horizontalPadding, paddingTop: ui.component.libraryTabs.topPadding }}>{tabsHeader}</View>
          </View>
      </Animated.View>

      {/* Sort & filter: iOS-style bottom sheet - sort radios, hide switches, Apply (approved gallery design). */}
      <Modal visible={sortSheetVisible && tab !== 'insights'} transparent animationType="fade" onRequestClose={() => setSortSheetVisible(false)}>
        <Pressable accessibilityLabel="Dismiss filters without applying" style={styles.sheetScrim} onPress={() => setSortSheetVisible(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 14 }]}>
          <View style={styles.sheetGrabber} />
          <Text style={styles.sheetHeading}>Sort by</Text>
          <View style={styles.sheetCard}>
            {([
              ['recent', 'Date added'], ['release', 'Release date'], ['title', 'Title A-Z'], ['rating', 'Highest rated'],
            ] as const).map(([key, label], i, arr) => (
              <Pressable key={key} onPress={() => setSort(key)} accessibilityRole="radio" accessibilityState={{ selected: sort === key }} style={[styles.sheetRow, i < arr.length - 1 && styles.sheetRowSep]}>
                <Text style={[styles.sheetRowText, sort === key && { color: colors.primary }]}>{label}</Text>
                {sort === key && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </Pressable>
            ))}
          </View>
          <Text style={styles.sheetHeading}>Hide</Text>
          <View style={styles.sheetCard}>
            {([
              ['Movies', hideMovies, setHideMovies], ['Series', hideSeries, setHideSeries], ['Unreleased', hideUnreleased, setHideUnreleased],
            ] as const).map(([label, value, set], i, arr) => (
              <View key={label} style={[styles.sheetRow, i < arr.length - 1 && styles.sheetRowSep]}>
                <Text style={styles.sheetRowText}>{label}</Text>
                <Switch value={value} onValueChange={() => set(v => !v)} trackColor={{ false: 'rgba(120,120,128,0.32)', true: colors.appleGreen }} thumbColor="#FFFFFF" ios_backgroundColor="rgba(120,120,128,0.32)" />
              </View>
            ))}
          </View>
          <Pressable accessibilityLabel="Apply filters" onPress={() => { setAppliedFilters({ hideMovies, hideSeries, hideUnreleased }); setAppliedSort(sort); setSortSheetVisible(false); }} style={styles.sheetApply}>
            <Text style={styles.sheetApplyText}>Apply</Text>
          </Pressable>
        </View>
      </Modal>

      <ActionSheet visible={menuVisible} onClose={() => setMenuVisible(false)} options={[
        { label: 'Share profile', onPress: shareProfile },
        { label: 'Activity', onPress: () => navigation.navigate('Activity') },
        { label: updateProgress === null ? 'Check for update' : `Downloading ${Math.round(updateProgress * 100)}%`, onPress: handleUpdateCheck },
        { label: 'Log out', onPress: () => Alert.alert('Log out?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: () => void logout() }]) },
      ]} />
      {quickItem && <LibraryQuickAction item={quickItem} onClose={() => setQuickItem(null)} onChanged={() => setRefreshKey(k => k + 1)} />}

      {/* Enlarged profile photo (owner rule, 25 Nov: tap the avatar, it opens big). Tap anywhere to close. */}
      <Modal visible={photoViewerVisible} transparent animationType="fade" onRequestClose={() => setPhotoViewerVisible(false)}>
        <Pressable accessibilityLabel="Close profile photo" style={styles.photoViewerBackdrop} onPress={() => setPhotoViewerVisible(false)}>
          <Avatar user={user} size={300} />
        </Pressable>
      </Modal>

    </View>
  );
};

const TMDB_IMG = 'https://image.tmdb.org/t/p/w342';

// "2h ago" style relative time for the insights activity rows.
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const mins = Math.max(1, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.round(days / 7)}w ago`;
}

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

// Apple redesign: series list row - poster, title, episode progress bar, chevron (grouped card look).
const SeriesRow = memo(function SeriesRow({ item, first, last, onPress, onLongPress }: { item: LibraryItem; first: boolean; last: boolean; onPress: (item: LibraryItem) => void; onLongPress?: (item: LibraryItem) => void }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const prog = seriesProgress(item);
  const { data: tmdb } = useTVDetailsQuery(item.tmdb_id, !!prog && prog.left === 0);
  const ended = isEndedComplete(prog, tmdb);
  const uri = item.poster_path ? `${TMDB_IMG}${item.poster_path}` : null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={() => onPress(item)} onLongPress={onLongPress ? () => onLongPress(item) : undefined}
      style={[styles.seriesRow, first && styles.seriesRowFirst, last && styles.seriesRowLast]}>
      {uri ? (
        <CachedImage source={{ uri }} style={styles.seriesPoster} contentFit="cover" transition={150} recyclingKey={uri} />
      ) : (
        <View style={[styles.seriesPoster, styles.seriesPosterFallback]}><Ionicons name="tv-outline" size={20} color={colors.textMuted} /></View>
      )}
      <View style={styles.seriesMeta}>
        <Text style={styles.seriesTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.seriesLine}>
          {prog ? `${prog.watched} of ${prog.total} episodes${ended ? ' · Done' : ''}` : ''}
          {item.rating !== null && <Text style={{ color: colors.appleAmber }}>{`  ★ ${item.rating}`}</Text>}
        </Text>
        {prog && <View style={styles.seriesProgress}><View style={[styles.seriesProgressFill, { width: `${Math.round(prog.fraction * 100)}%` }]} /></View>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.appleText3} />
    </Pressable>
  );
});

const createStyles = (colors: AppColors) => StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: ui.component.topRow.horizontalPadding, paddingBottom: ui.space.sm },
  // Apple redesign: iOS circle buttons and red V tile.
  circleButton: {
    width: ui.component.topRow.buttonSize,
    height: ui.component.topRow.buttonSize,
    borderRadius: ui.component.topRow.buttonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.appleFill,
  },
  brand: { fontSize: 9, letterSpacing: 2, color: colors.primary, fontWeight: '700' },
  brandIcon: {
    width: ui.component.topRow.brandIconSize,
    height: ui.component.topRow.brandIconSize,
    borderRadius: ui.component.topRow.brandIconRadius,
    marginLeft: ui.component.topRow.brandIconMarginLeft,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: ui.space.md },
  photoViewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  root: { flex: 1, backgroundColor: colors.background },
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, elevation: 10 },
  listContent: { paddingHorizontal: ui.component.libraryGrid.horizontalPadding, paddingTop: ui.component.libraryGrid.topPadding, paddingBottom: ui.component.libraryGrid.bottomPadding },
  gridCell: { flex: 1 / 2, padding: ui.component.libraryGrid.cellPadding },
  header: { gap: 0, paddingBottom: ui.space.md, paddingHorizontal: ui.component.libraryHeader.innerHorizontalPadding },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ui.component.profileHeader.identityGap,
  },
  identityText: { flex: 1, gap: 2 },
  avatar: {
    width: ui.component.profileHeader.avatarSize,
    height: ui.component.profileHeader.avatarSize,
    borderRadius: ui.component.profileHeader.avatarSize / 2,
    backgroundColor: colors.trackBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: ui.component.profileHeader.avatarTextSize, fontWeight: '900', color: '#fff' },
  // Apple redesign: iOS large title + secondary handle line.
  name: { fontSize: 34, fontWeight: '700', letterSpacing: 0.3, color: colors.appleText },
  handle: { fontSize: 13, color: colors.appleText2, marginTop: 2 },
  username: { fontSize: 13, color: colors.textTertiary },
  bio: { fontSize: 13, color: colors.appleText2, marginTop: ui.space.xs },
  // Apple redesign: one grouped stats card with hairline separators.
  statCard: {
    marginTop: 14,
    backgroundColor: colors.appleCard,
    borderRadius: 14,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: '700', color: colors.appleText },
  statLabel: { fontSize: 11, color: colors.appleText2, marginTop: 1 },
  statSep: { width: StyleSheet.hairlineWidth, backgroundColor: colors.appleSeparator, marginVertical: 4 },
  // Apple redesign: iOS segmented control + filter circle button.
  segRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  seg: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.appleSegTrack,
    borderRadius: 10,
    padding: 2,
  },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8 },
  segItemActive: {
    backgroundColor: colors.appleSegActive,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segText: { fontSize: 13, fontWeight: '500', color: colors.appleText2 },
  segTextActive: { color: colors.appleText },
  // Apple redesign: iOS bottom sheet for sort & filter.
  sheetScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.appleCard,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sheetGrabber: { width: 36, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(120,120,128,0.5)', alignSelf: 'center', marginBottom: 10 },
  sheetHeading: { fontSize: 13, fontWeight: '600', color: colors.appleText2, marginTop: 4, marginBottom: 6, marginLeft: 4 },
  sheetCard: { backgroundColor: 'rgba(120,120,128,0.16)', borderRadius: 12 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11 },
  sheetRowSep: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.appleSeparator },
  sheetRowText: { fontSize: 15, color: colors.appleText },
  sheetApply: { marginTop: 12, backgroundColor: colors.primary, borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  sheetApplyText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  // Apple redesign: series rows in a grouped card.
  seriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ui.space.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: ui.component.libraryGrid.cellPadding,
    backgroundColor: colors.appleCard,
  },
  seriesRowFirst: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  seriesRowLast: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14, marginBottom: 14 },
  seriesPoster: { width: 48, height: 72, borderRadius: 8, backgroundColor: '#2C2C2E' },
  seriesPosterFallback: { alignItems: 'center', justifyContent: 'center' },
  seriesMeta: { flex: 1 },
  seriesTitle: { fontSize: 15, fontWeight: '600', color: colors.appleText },
  seriesLine: { fontSize: 12, color: colors.appleText2, marginTop: 1 },
  seriesProgress: { height: 4, borderRadius: 2, backgroundColor: 'rgba(120,120,128,0.3)', overflow: 'hidden', marginTop: 5 },
  seriesProgressFill: { height: '100%', borderRadius: 2, backgroundColor: colors.appleBlue },
  seriesSep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.appleSeparator, marginLeft: 80, marginRight: 20 },
  // Apple redesign: insights tiles + red ratings chart card.
  insights: { paddingTop: 6, paddingBottom: 20 },
  insightGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: ui.component.libraryGrid.cellPadding },
  insightTile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.appleCard,
    borderRadius: 14,
    padding: 12,
    gap: 2,
  },
  insightTileLabel: { fontSize: 12, color: colors.appleText2 },
  insightTileValue: { fontSize: 24, fontWeight: '700', color: colors.appleText },
  insightTileSub: { fontSize: 11, color: colors.appleText3 },
  chartCard: {
    marginTop: 10,
    marginHorizontal: ui.component.libraryGrid.cellPadding,
    backgroundColor: colors.appleCard,
    borderRadius: 14,
    padding: 14,
  },
  chartTitle: { fontSize: 15, fontWeight: '600', color: colors.appleText },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 110, paddingTop: 10 },
  chartCol: { flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' },
  chartBar: { width: '100%', borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: colors.appleRedSoft },
  chartBarPeak: { backgroundColor: colors.primary },
  chartLabel: { fontSize: 10, color: colors.appleText3 },
  actRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  actRowSep: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.appleSeparator },
  actTitle: { fontSize: 14, fontWeight: '600', color: colors.appleText },
  actSub: { fontSize: 12, color: colors.appleText2, marginTop: 1 },
  emptyRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: ui.space.xxl,
    backgroundColor: colors.background,
  },
  emptyTitle: { fontSize: ui.type.heading, fontWeight: '800', color: colors.textPrimary },
  emptyText: { fontSize: 13, color: colors.textTertiary, textAlign: 'center', lineHeight: 19, paddingHorizontal: ui.space.lg, marginTop: ui.space.xl },
});
