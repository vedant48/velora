import { NavigatorScreenParams } from '@react-navigation/native';
import { MediaItem } from '../api/types';

export type MainTabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  TVTab: undefined;
  ExploreAllTab: undefined;
  // WatchlistTab: removed 21 Nov (Want is the unified watchlist); type kept
  // commented so restoring the tab is a one-line uncomment.
  // WatchlistTab: undefined;
  ProfileTab: undefined;
  DebugTab: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  Details: { item: MediaItem };
  Genre: { genreId: number; genreName: string; mediaType?: 'movie' | 'tv' };
  Collection: { collectionId: number; collectionName: string };
  Auth: undefined;
  UserProfile: { username: string };
  Activity: undefined;
  Account: undefined;
};

