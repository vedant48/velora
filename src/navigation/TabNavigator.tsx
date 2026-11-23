import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoviesExploreScreen, TVExploreScreen, AllExploreScreen } from '../screens/Home/ExploreScreen';
import { SearchScreen } from '../screens/Search/SearchScreen';
import { MainTabParamList } from './types';
// WatchlistScreen import removed with the tab (user direction 21 Nov: Want is
// the watchlist now; screen source stays at ../screens/Watchlist/WatchlistScreen)
import { DebugScreen } from '../screens/Debug/DebugScreen';
import { LibraryScreen } from '../screens/Profile/LibraryScreen';
import { AppColors, useAppTheme, useThemedStyles } from '../theme/ThemeContext';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const TabNavigator: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator initialRouteName="ProfileTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.cardBackground,
          borderTopColor: colors.border,
          borderTopWidth: 0,
          height: 60 + Math.max(insets.bottom - 6, 0),
          paddingBottom: Math.max(insets.bottom - 4, 6),
          paddingTop: 6,
          elevation: 8,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: -2,
        },
        tabBarIcon: ({ color, focused, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'HomeTab') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'SearchTab') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'TVTab') {
            iconName = focused ? 'tv' : 'tv-outline';
          } else if (route.name === 'ExploreAllTab') {
            iconName = focused ? 'flash' : 'flash-outline';
          } else if (route.name === 'DebugTab') {
            iconName = focused ? 'speedometer' : 'speedometer-outline';
          }

          return (
            <View style={focused ? styles.activeIconWrapper : styles.iconWrapper}>
              <Ionicons name={iconName} size={21} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="ProfileTab"
        component={LibraryScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="HomeTab"
        component={MoviesExploreScreen}
        options={{ tabBarLabel: 'Movies', tabBarAccessibilityLabel: 'Explore Movies' }}
      />
      <Tab.Screen name="TVTab" component={TVExploreScreen} options={{ tabBarAccessibilityLabel: 'Explore TV Series' }} />
      <Tab.Screen name="ExploreAllTab" component={AllExploreScreen} options={{ tabBarAccessibilityLabel: 'Explore All' }} />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{ tabBarLabel: 'Search', tabBarStyle: { display: 'none' } }}
      />
      {/* Watchlist tab removed (user direction 21 Nov): Want is the unified
          watchlist, reached from Profile > Want. Screen source kept at
          ../screens/Watchlist/WatchlistScreen; restore by uncommenting.
      <Tab.Screen
        name="WatchlistTab"
        component={WatchlistScreen}
        options={{ tabBarLabel: 'Watchlist' }}
      />
      */}
      {/* Debug/Performance tab: dev-only. Hidden from release builds; the
          code stays here (commented intent, not deleted) so local performance
          work can restore it by running a dev build or uncommenting. */}
      {__DEV__ ? (
        <Tab.Screen
          name="DebugTab"
          component={DebugScreen}
          options={{ tabBarLabel: 'Performance' }}
        />
      ) : null}
    </Tab.Navigator>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
