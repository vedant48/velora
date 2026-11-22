import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { avatarUrl, getToken, VeloraUser } from '../api/velora';
import { useAppTheme } from '../theme/ThemeContext';

// The avatar endpoint requires a bearer token like the rest of the API.
// Token is stable per session; cache the storage read module-wide.
let tokenPromise: Promise<string | null> | null = null;
function sessionToken(): Promise<string | null> {
  if (!tokenPromise) tokenPromise = getToken().catch(() => null);
  return tokenPromise;
}

/**
 * Shared user avatar: profile photo when the user has one, otherwise a
 * brand-tinted disc with their initial. The photo request carries the auth
 * header explicitly (RN Image sends none by default); a photo that still
 * fails to load falls back to the initial.
 */
export function Avatar({ user, size = 40 }: { user?: Pick<VeloraUser, 'username' | 'displayName' | 'avatarAt'> | null; size?: number }) {
  const { colors } = useAppTheme();
  const [failed, setFailed] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const uri = user ? avatarUrl(user.username, user.avatarAt) : null;

  useEffect(() => {
    let alive = true;
    sessionToken().then((t) => {
      if (alive) setToken(t);
    });
    return () => {
      alive = false;
    };
  }, []);

  // A replaced photo changes the URL; clear any stale failure so it retries.
  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const radius = size / 2;
  const initial = ((user?.displayName || user?.username || '?').trim().charAt(0) || '?').toUpperCase();

  if (uri && token && !failed) {
    return (
      <Image
        source={{ uri, headers: { Authorization: `Bearer ${token}` } }}
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
