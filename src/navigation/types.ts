import { NavigatorScreenParams } from '@react-navigation/native';
import { MediaItem } from '../api/types';

export type MainTabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  WatchlistTab: undefined;
  ProfileTab: undefined;
  DebugTab: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  Details: { item: MediaItem };
  Genre: { genreId: number; genreName: string; mediaType?: 'movie' | 'tv' };
};

