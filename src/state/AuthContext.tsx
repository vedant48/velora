import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { isApiConfigured, GOOGLE_WEB_CLIENT_ID } from '../config';
import { veloraApi, VeloraUser, setToken, getToken } from '../api/velora';
import { migrateLocalWatchlist, needsMigration } from '../services/migration';
import { Alert } from 'react-native';

/**
 * Legacy local watchlists predate accounts. Before importing one, disclose
 * that tracked titles live on a member-visible profile (private mode exists
 * in Settings) and get an explicit yes. "Not now" leaves local data in place
 * and asks again at the next login.
 */
function offerWatchlistMigration(): void {
  void needsMigration()
    .then((needed) => {
      if (!needed) return;
      Alert.alert(
        'Bring your saved list?',
        'Titles saved on this device will be added to your account as Want. Tracked titles and ratings are visible to other signed-in Velora members; you can make your profile private anytime in Settings.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Add to my account',
            onPress: () => {
              void migrateLocalWatchlist().catch(() => undefined);
            },
          },
        ],
      );
    })
    .catch(() => undefined);
}

/** Lazily loaded so the app still runs where the native module is unavailable (Expo Go / web). */
async function googleIdToken(): Promise<string | null> {
  if (Platform.OS === 'web') throw new Error('Google sign-in is only available in the Android app');
  const { GoogleOneTapSignIn, isCancelledResponse, isNoSavedCredentialFoundResponse } = await import(
    'react-native-nitro-google-signin'
  );
  GoogleOneTapSignIn.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  await GoogleOneTapSignIn.checkPlayServices();
  let res = await GoogleOneTapSignIn.signIn();
  if (isNoSavedCredentialFoundResponse(res)) {
    // No previously authorized account: show the full account picker.
    res = await GoogleOneTapSignIn.createAccount();
  }
  if (isCancelledResponse(res)) return null;
  const idToken = res.data?.idToken;
  if (!idToken) throw new Error('Google did not return an ID token');
  return idToken;
}

interface AuthState {
  user: VeloraUser | null;
  loading: boolean;
  /** False until the backend URL is configured; app then runs in local-only mode. */
  apiReady: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, displayName?: string) => Promise<void>;
  /** Google sign-in. Resolves without error when the user cancels the picker. */
  loginWithGoogle: () => Promise<'ok' | 'cancelled'>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<VeloraUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isApiConfigured) return;
        const token = await getToken();
        if (!token) return;
        const { user: me } = await veloraApi.me();
        if (!cancelled) setUser(me);
        offerWatchlistMigration();
      } catch {
        // Expired/invalid token or unreachable API: drop session, stay logged out.
        await setToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      setLoading(false);
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await veloraApi.login(username, password);
    await setToken(res.token);
    setUser(res.user);
    offerWatchlistMigration();
  }, []);

  const signup = useCallback(async (username: string, password: string, displayName?: string) => {
    const res = await veloraApi.signup(username, password, displayName);
    await setToken(res.token);
    setUser(res.user);
    offerWatchlistMigration();
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<'ok' | 'cancelled'> => {
    const idToken = await googleIdToken();
    if (!idToken) return 'cancelled';
    const res = await veloraApi.googleLogin(idToken);
    await setToken(res.token);
    setUser(res.user);
    offerWatchlistMigration();
    return 'ok';
  }, []);

  const logout = useCallback(async () => {
    await setToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { user: me } = await veloraApi.me();
      setUser(me);
    } catch {
      // keep existing state
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, apiReady: isApiConfigured, login, signup, loginWithGoogle, logout, refresh }),
    [user, loading, login, signup, loginWithGoogle, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
