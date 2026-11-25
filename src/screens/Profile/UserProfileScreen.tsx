import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CachedImage as Image } from '../../experience/CachedImage';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { veloraApi } from '../../api/velora';
import { AppLoader } from '../../components/common/AppLoader';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../state/AuthContext';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { ui } from '../../theme/ui';
import { getImageUrl } from '../../utils/image';
import { Avatar } from '../../components/Avatar';

type Nav = NativeStackNavigationProp<RootStackParamList, 'UserProfile'>;
type Rt = RouteProp<RootStackParamList, 'UserProfile'>;

/** Public profile of another user: stats, match score, follow, their tracked titles. */
export const UserProfileScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
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
    enabled: !profileQuery.data?.isPrivate,
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
        <AppLoader />
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

  const { user, stats, isFollowing, isPrivate } = profileQuery.data;
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
        <Avatar user={user} size={72} />
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
              <View style={styles.matchCard}>
                <Ionicons name="heart" size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.matchTitle}>{match.percent}% match</Text>
                  <Text style={styles.matchSub}>Based on {match.sharedRated} titles you both rated</Text>
                </View>
              </View>
            )}
          </View>
        )}
        {!me && (
          <Text style={styles.hint}>Log in to follow and see your match score.</Text>
        )}

        {isPrivate || !stats ? (
          <View style={styles.matchBadge}>
            <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
            <Text style={[styles.matchText, { color: colors.textSecondary }]}>Private account</Text>
          </View>
        ) : (
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
        )}
      </View>

      {!isPrivate && !!stats && <Text style={styles.sectionTitle}>Watched recently</Text>}
      {isPrivate || !stats ? null : libraryQuery.isLoading ? (
        <AppLoader />
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

const createStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  errorText: { color: colors.textSecondary, fontSize: ui.type.body, marginBottom: ui.space.md },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginBottom: ui.space.sm,
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
    marginBottom: ui.space.xs,
  },
  avatarText: { fontSize: 30, fontWeight: '900', color: colors.primary },
  name: { fontSize: ui.type.screenTitle, fontWeight: '800', color: colors.textPrimary },
  username: { fontSize: 13, color: colors.textSecondary },
  bio: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: ui.space.xs },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  followButton: {
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  followingButton: { backgroundColor: colors.appleFill, borderWidth: 0 },
  followText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  followingText: { color: colors.appleText2 },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'stretch',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.appleCard,
  },
  matchTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  matchSub: { color: colors.appleText2, fontSize: 12, marginTop: 1 },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: ui.space.md,
    paddingVertical: ui.space.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  matchText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  hint: { marginTop: ui.space.sm, fontSize: ui.type.label, color: colors.textMuted },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    marginTop: 14,
    backgroundColor: colors.appleCard,
    borderRadius: 14,
    paddingVertical: ui.space.md,
    paddingHorizontal: ui.space.sm,
  },
  stat: { alignItems: 'center', minWidth: 52 },
  statValue: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  statLabel: { fontSize: 10, color: colors.appleText2, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: colors.textPrimary, marginBottom: 10 },
  emptyText: { fontSize: 13, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: ui.space.sm },
  cell: { width: '23%' },
  poster: { width: '100%', aspectRatio: 2 / 3, borderRadius: 8 },
  rating: { fontSize: 10, color: colors.textSecondary, marginTop: 3 },
});
