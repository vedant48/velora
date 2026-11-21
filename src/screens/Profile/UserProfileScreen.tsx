import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { Image } from 'expo-image';
import { veloraApi } from '../../api/velora';
import { useAuth } from '../../state/AuthContext';
import { getImageUrl } from '../../utils/image';
import { colors } from '../../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList, 'UserProfile'>;
type Rt = RouteProp<RootStackParamList, 'UserProfile'>;

/** Public profile of another user: stats, match score, follow, their tracked titles. */
export const UserProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { username } = useRoute<Rt>().params;
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [followBusy, setFollowBusy] = useState(false);

  const isSelf = me?.username === username;

  const profileQuery = useQuery({
    queryKey: ['userProfile', username],
    queryFn: () => veloraApi.getUser(username),
  });

  const libraryQuery = useQuery({
    queryKey: ['userLibrary', username],
    queryFn: () => veloraApi.getUserLibrary(username, 'watched'),
  });

  const matchQuery = useQuery({
    queryKey: ['match', username],
    queryFn: () => veloraApi.match(username),
    enabled: !!me && !isSelf,
  });

  const toggleFollow = useCallback(async () => {
    if (!me || followBusy || !profileQuery.data) return;
    setFollowBusy(true);
    try {
      if (profileQuery.data.isFollowing) {
        await veloraApi.unfollow(username);
      } else {
        await veloraApi.follow(username);
      }
      await queryClient.invalidateQueries({ queryKey: ['userProfile', username] });
    } catch {
      // keep prior state; a retry is one tap away
    } finally {
      setFollowBusy(false);
    }
  }, [me, followBusy, profileQuery.data, username, queryClient]);

  if (profileQuery.isLoading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Could not load this profile.</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButtonAlt}>
          <Text style={styles.followText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const { user, stats, isFollowing } = profileQuery.data;
  const match = matchQuery.data;
  const watched = libraryQuery.data?.items ?? [];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40, paddingHorizontal: 20 }}
    >
      <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Back">
        <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
      </Pressable>

      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user.displayName || user.username).slice(0, 1).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user.displayName}</Text>
        <Text style={styles.username}>@{user.username}</Text>
        {!!user.bio && <Text style={styles.bio}>{user.bio}</Text>}

        {!isSelf && me && (
          <View style={styles.actionRow}>
            <Pressable
              onPress={toggleFollow}
              disabled={followBusy}
              style={[styles.followButton, isFollowing && styles.followingButton, followBusy && { opacity: 0.6 }]}
            >
              <Text style={[styles.followText, isFollowing && styles.followingText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
            {match?.percent != null && (
              <View style={styles.matchBadge}>
                <Ionicons name="heart" size={14} color={colors.primary} />
                <Text style={styles.matchText}>{match.percent}% match</Text>
              </View>
            )}
          </View>
        )}
        {!me && (
          <Text style={styles.hint}>Log in to follow and see your match score.</Text>
        )}

        <View style={styles.statsRow}>
          {(
            [
              ['Watched', stats.watched],
              ['Want', stats.want],
              ['Watching', stats.watching],
              ['Reviews', stats.reviews],
              ['Followers', stats.followers],
              ['Following', stats.following],
            ] as const
          ).map(([label, value]) => (
            <View key={label} style={styles.stat}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Watched</Text>
      {libraryQuery.isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : watched.length === 0 ? (
        <Text style={styles.emptyText}>Nothing watched yet.</Text>
      ) : (
        <View style={styles.grid}>
          {watched.slice(0, 24).map((item) => (
            <View key={item.id} style={styles.cell}>
              <Image
                source={{ uri: getImageUrl(item.poster_path ?? item.backdrop_path, 'poster') ?? undefined }}
                style={styles.poster}
                contentFit="cover"
                transition={120}
              />
              {item.rating != null && (
                <Text style={styles.rating}>
                  <Ionicons name="star" size={10} color={colors.accentAmber} /> {item.rating}/10
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  errorText: { color: colors.textSecondary, fontSize: 14, marginBottom: 12 },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  backButtonAlt: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.surface },
  header: { alignItems: 'center', gap: 6, paddingBottom: 18 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: { fontSize: 30, fontWeight: '900', color: colors.primary },
  name: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  username: { fontSize: 13, color: colors.textSecondary },
  bio: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  followButton: {
    paddingHorizontal: 26,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  followingButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.surfaceBorder },
  followText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  followingText: { color: colors.textSecondary },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  matchText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  hint: { marginTop: 8, fontSize: 12, color: colors.textMuted },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    marginTop: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  stat: { alignItems: 'center', minWidth: 52 },
  statValue: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 10 },
  emptyText: { fontSize: 13, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '23%' },
  poster: { width: '100%', aspectRatio: 2 / 3, borderRadius: 8 },
  rating: { fontSize: 10, color: colors.textSecondary, marginTop: 3 },
});
