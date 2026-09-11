import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabParamList } from './types';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { SearchScreen } from '../screens/Search/SearchScreen';
import { WatchlistScreen } from '../screens/Watchlist/WatchlistScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';
import { DebugScreen } from '../screens/Debug/DebugScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const TabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(14, 14, 20, 0.94)',
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          height: 60 + Math.max(insets.bottom - 6, 0),
          paddingBottom: Math.max(insets.bottom - 4, 6),
          paddingTop: 6,
          elevation: 8,
        },
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
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'SearchTab') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'WatchlistTab') {
            iconName = focused ? 'bookmark' : 'bookmark-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
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
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{ tabBarLabel: 'Search' }}
      />
      <Tab.Screen
        name="WatchlistTab"
        component={WatchlistScreen}
        options={{ tabBarLabel: 'Watchlist' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
      <Tab.Screen
        name="DebugTab"
        component={DebugScreen}
        options={{ tabBarLabel: 'Performance' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
