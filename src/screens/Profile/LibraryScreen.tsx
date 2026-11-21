import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../state/AuthContext';
import { veloraApi, LibraryItem, UserStats } from '../../api/velora';
import { LibraryCard } from '../../components/Library/LibraryCard';

type TabKey = 'watched' | 'want' | 'series';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'watched', label: 'Watched' },
  { key: 'want', label: 'Want' },
  { key: 'series', label: 'Series' },
];

/** Must-style profile: stats + rank, Watched/Want/Series tabs with personal ratings. */
export const LibraryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, logout, apiReady } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [tab, setTab] = useState<TabKey>('watched');
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    veloraApi.getUser(user.username).then(({ stats }) => setStats(stats)).catch(() => undefined);
  }, [user]);

  useEffect(() => {
    if (!user) return;
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
    ({ item }: { item: LibraryItem }) => <LibraryCard item={item} onPress={openItem} onLongPress={removeItem} />,
    [openItem, removeItem],
  );

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.displayName?.[0] ?? '?').toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.displayName}</Text>
        <Text style={styles.username}>@{user?.username}</Text>
        {!!user?.bio && <Text style={styles.bio}>{user.bio}</Text>}
        <View style={styles.statsRow}>
          <Stat label="Watched" value={stats?.watched} />
          <Stat label="Want" value={stats?.want} />
          <Stat label="Series" value={stats?.series} />
          <Stat label="Rank" value={stats ? `#${stats.rank}` : undefined} />
        </View>
        <View style={styles.actionsRow}>
          <Pressable onPress={shareProfile} style={styles.actionButton}>
            <Ionicons name="share-social-outline" size={15} color={colors.textPrimary} />
            <Text style={styles.actionText}>Share</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Activity')} style={styles.actionButton}>
            <Ionicons name="pulse-outline" size={15} color={colors.textPrimary} />
            <Text style={styles.actionText}>Activity</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert('Log out?', undefined, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log out', style: 'destructive', onPress: () => void logout() },
              ])
            }
            style={styles.actionButton}
          >
            <Ionicons name="log-out-outline" size={15} color={colors.textPrimary} />
            <Text style={styles.actionText}>Log out</Text>
          </Pressable>
        </View>
        <View style={styles.tabsRow}>
          {TABS.map((t) => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    ),
    [user, stats, tab, shareProfile, logout],
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
    <FlashList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      numColumns={3}
      ListHeaderComponent={header}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : (
          <Text style={styles.emptyText}>Nothing here yet. Rate and track from any title page.</Text>
        )
      }
    />
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

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 10, paddingTop: 60, paddingBottom: 110 },
  header: { alignItems: 'center', gap: 6, paddingBottom: 16 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 30, fontWeight: '900', color: '#fff' },
  name: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  username: { fontSize: 13, color: colors.textTertiary },
  bio: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  statsRow: { flexDirection: 'row', gap: 22, marginTop: 10 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  actionText: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  tabsRow: { flexDirection: 'row', gap: 6, marginTop: 16 },
  tab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: colors.textTertiary },
  tabTextActive: { color: '#fff' },
  emptyRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 32,
    backgroundColor: colors.background,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  emptyText: { fontSize: 13, color: colors.textTertiary, textAlign: 'center', lineHeight: 19, paddingHorizontal: 16 },
  loginButton: { marginTop: 8, backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  loginButtonText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
