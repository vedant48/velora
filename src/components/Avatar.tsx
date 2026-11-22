import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { avatarUrl, VeloraUser } from '../api/velora';
import { useAppTheme } from '../theme/ThemeContext';

/**
 * Shared user avatar: profile photo when the user has one, otherwise a
 * brand-tinted disc with their initial. Photos are cached per avatarAt.
 */
export function Avatar({ user, size = 40 }: { user?: Pick<VeloraUser, 'username' | 'displayName' | 'avatarAt'> | null; size?: number }) {
  const { colors } = useAppTheme();
  const [failed, setFailed] = useState(false);
  const uri = user ? avatarUrl(user.username, user.avatarAt) : null;

  // A replaced photo changes the URL; clear any stale failure so it retries.
  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const radius = size / 2;
  const initial = ((user?.displayName || user?.username || '?').trim().charAt(0) || '?').toUpperCase();

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: colors.surfaceBorder }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: colors.primary + '22',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.primary, fontSize: size * 0.45, fontWeight: '700' }}>{initial}</Text>
    </View>
  );
}
