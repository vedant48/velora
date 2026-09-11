import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AnimatedSplash } from './src/components/Splash/AnimatedSplash';
import { colors } from './src/theme/colors';

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

const VeloraTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.cardBackground,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.primary,
  },
};

export default function App() {
  const [isSplashDone, setIsSplashDone] = useState(false);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer theme={VeloraTheme}>
            <StatusBar style="light" />
            <AppNavigator />
          </NavigationContainer>
        </QueryClientProvider>

        {/* Netflix-Style Cinematic Animated Space Splash Screen */}
        {!isSplashDone && (
          <AnimatedSplash onFinish={() => setIsSplashDone(true)} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
