import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { MovieCard } from '../../components/MovieCard/MovieCard';
import { useAppTheme } from '../../theme/ThemeContext';
export function TVCollectionScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'TVCollection'>>();
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = (width - 48) / 3;
  return <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16 }}>
    <ScreenHeader title={params.title} onBack={() => navigation.goBack()} />
    <FlashList data={params.items} numColumns={3} keyExtractor={i => String(i.id)} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }} renderItem={({ item }) => <View style={{ padding: 2 }}><MovieCard item={item} width={cardWidth} height={cardWidth * 1.5} minimal hasMarginRight={false} onPress={item => navigation.push('Details', { item })} /></View>} />
  </View>;
}
