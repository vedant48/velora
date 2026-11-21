import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isApiConfigured } from '../config';
import { veloraApi, VeloraUser, setToken, getToken } from '../api/velora';

interface AuthState {
  user: VeloraUser | null;
  loading: boolean;
  /** False until the backend URL is configured; app then runs in local-only mode. */
  apiReady: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, displayName?: string) => Promise<void>;
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
  }, []);

  const signup = useCallback(async (username: string, password: string, displayName?: string) => {
    const res = await veloraApi.signup(username, password, displayName);
    await setToken(res.token);
    setUser(res.user);
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
    () => ({ user, loading, apiReady: isApiConfigured, login, signup, logout, refresh }),
    [user, loading, login, signup, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
