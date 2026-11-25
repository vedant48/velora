import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { avatarUrl, sessionToken, VeloraUser } from '../api/velora';
import { useAppTheme } from '../theme/ThemeContext';

/**
 * Shared user avatar: profile photo when the user has one, otherwise a
 * brand-tinted disc with their initial. The photo request carries the auth
 * header explicitly (RN Image sends none by default); a photo that still
 * fails to load falls back to the initial. Android RN 0.85 forwards headers
 * only from array sources, so keep the single source wrapped in an array.
 */
export function Avatar({ user, size = 40, letters = 1 }: { user?: Pick<VeloraUser, 'username' | 'displayName' | 'avatarAt'> | null; size?: number; letters?: 1 | 2 }) {
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
  }, [user?.username]);

  // A replaced photo changes the URL; clear any stale failure so it retries.
  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const radius = size / 2;
  const base = (user?.displayName || user?.username || '?').trim() || '?';
  const initial = (letters === 2 ? base.slice(0, 2) : base.charAt(0)).toUpperCase();

  if (uri && token && !failed) {
    return (
      <Image
        source={[{ uri, headers: { Authorization: `Bearer ${token}` } }]}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: colors.surfaceBorder }}
      />
    );
  }

  // Gallery fallback when the user has no real photo: brand gradient disc, white initial.
  // A real uploaded photo always wins above and is never tinted.
  return (
    <LinearGradient
      colors={['#E50914', '#7928CA']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#FFF', fontSize: size * (letters === 2 ? 0.36 : 0.45), fontWeight: '700' }}>{initial}</Text>
    </LinearGradient>
  );
}
