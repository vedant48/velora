import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { warmProxy } from './src/api/client';
import { AnimatedSplash } from './src/components/Splash/AnimatedSplash';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthProvider } from './src/state/AuthContext';
import { SplashDoneProvider } from './src/state/SplashContext';
import { ThemeProvider, useAppTheme } from './src/theme/ThemeContext';

// Keep the native splash up until the JS splash overlay has mounted with the
// resolved theme, so the handoff native -> JS is the same composition
// (ribbon V on theme background) with no flash.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Ultra-performant TanStack Query client with aggressive caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes cache freshness
      gcTime: 60 * 60 * 1000, // 1 hour garbage collection
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

export default function App() {
  return <ThemeProvider><ThemedApp /></ThemeProvider>;
}

function ThemedApp() {
  const { colors, mode, ready } = useAppTheme();
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: colors.background, card: colors.cardBackground, text: colors.textPrimary, border: colors.border, primary: colors.primary } };
  const [isSplashDone, setIsSplashDone] = useState(false);
  const nativeSplashHidden = useRef(false);

  const hideNativeSplash = useCallback(() => {
    if (nativeSplashHidden.current) return;
    nativeSplashHidden.current = true;
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  // Wake the TMDB proxy while the splash is up, not when the first screen asks.
  useEffect(() => { warmProxy(); }, []);

  useEffect(() => {
    // Safety net only. The splash overlay hides the native layer itself once
    // its own first frame has painted (onFirstFrame below), so the identical
    // composition is already on screen and there is no blank gap. If the
    // overlay somehow never paints, do not trap startup behind the native layer.
    if (!ready) return;
    const t = setTimeout(hideNativeSplash, 2500);
    return () => clearTimeout(t);
  }, [ready, hideNativeSplash]);

  return (
    <GestureHandlerRootView style={{flex: 1, backgroundColor: colors.background}}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
          {ready && <SplashDoneProvider value={isSplashDone}><NavigationContainer theme={theme}>
            <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
            <AppNavigator />
          </NavigationContainer></SplashDoneProvider>}
          </AuthProvider>
        </QueryClientProvider>

        {/* Cinematic V -> VELORA splash; dismissed by app readiness, not a
            fixed hold. Only render once the saved theme is resolved so the
            first painted frame already matches it (no theme flash). */}
        {ready && !isSplashDone && (
          <AnimatedSplash appReady={ready} onFinish={() => setIsSplashDone(true)} onFirstFrame={hideNativeSplash} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
