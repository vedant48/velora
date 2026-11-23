import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { TVCollectionScreen } from '../screens/Collection/TVCollectionScreen';
import { AuthScreen } from '../screens/Auth/AuthScreen';
import { CollectionScreen } from '../screens/Collection/CollectionScreen';
import { DetailsScreen } from '../screens/Details/DetailsScreen';
import { GenreScreen } from '../screens/Genre/GenreScreen';
import { AccountScreen } from '../screens/Profile/AccountScreen';
import { ActivityScreen } from '../screens/Profile/ActivityScreen';
import { UserProfileScreen } from '../screens/Profile/UserProfileScreen';
import { useAppTheme } from '../theme/ThemeContext';
import { TabNavigator } from './TabNavigator';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { colors } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
        animationDuration: 220,
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen
        name="Details"
        component={DetailsScreen}
        options={{
          animation: 'fade_from_bottom',
        }}
      />
      <Stack.Screen
        name="Genre"
        component={GenreScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="Auth"
        component={AuthScreen}
        options={{
          animation: 'fade_from_bottom',
        }}
      />
      <Stack.Screen
        name="Collection"
        component={CollectionScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen name="TVCollection" component={TVCollectionScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen
        name="Activity"
        component={ActivityScreen}
        options={{
          animation: 'fade_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
};
