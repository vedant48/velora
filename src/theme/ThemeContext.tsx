import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { colors as darkColors } from './colors';

import { THEME_PREFERENCE_KEY, ThemePreference, readThemePreference, resolveThemeMode } from './preferences';
export type { ThemePreference } from './preferences';
export type AppColors = { [K in keyof typeof darkColors]: string };
const lightColors: AppColors = {
  ...darkColors,
  background: '#FFFFFF', backgroundSecondary: '#F9F9FA', cardBackground: '#FFFFFF',
  surface: '#F4F4F4', surfaceLight: '#E5E5E9', surfaceBorder: '#D9D9DF',
  textPrimary: '#333338', textSecondary: '#63636C', textTertiary: '#73737D', textMuted: '#777780',
  border: '#E8E8EC', borderHighlight: '#B6B6C0',
  overlayDark: 'rgba(255,255,255,0.8)', glassDark: 'rgba(255,255,255,0.94)',
  shimmerBase: '#E7E7EC', shimmerHighlight: '#F4F4F6',
  // Apple-style redesign palette, light-theme values (iOS system colors).
  appleCard: '#FFFFFF', appleFill: 'rgba(120,120,128,0.16)', appleSegTrack: 'rgba(118,118,128,0.12)',
  appleSegActive: '#FFFFFF', appleText: '#000000', appleText2: 'rgba(60,60,67,0.6)',
  appleText3: 'rgba(60,60,67,0.45)', appleSeparator: 'rgba(0,0,0,0.08)', appleBlue: '#007AFF',
  appleAmber: '#FF9500', appleGreen: '#34C759', appleRedSoft: 'rgba(229,9,20,0.4)', appleTabBar: '#F9F9FA',
};
const ThemeContext = createContext({
  colors: darkColors as AppColors, preference: 'system' as ThemePreference,
  mode: 'dark' as 'light' | 'dark', ready: false,
  setPreference: async (_value: ThemePreference): Promise<void> => {},
});
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemMode = useColorScheme();
  const [preference, setChoice] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(THEME_PREFERENCE_KEY).then(raw => {
      if (active) setChoice(readThemePreference(raw));
    }).catch(() => undefined).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  const setPreference = useCallback(async (value: ThemePreference) => {
    // Persist first so a failed save is visible and never presented as a saved preference.
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, JSON.stringify(value));
    setChoice(value);
  }, []);
  const mode = resolveThemeMode(preference, systemMode);
  const value = useMemo(() => ({ colors: mode === 'dark' ? darkColors : lightColors, preference, mode, ready, setPreference }), [mode, preference, ready, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export const useAppTheme = () => useContext(ThemeContext);
export function useThemedStyles<T>(factory: (colors: AppColors) => T): T {
  const { colors } = useAppTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}
