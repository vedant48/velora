import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { ui } from '../../theme/ui';

/** About & Credits: opened from the compact row in Settings. */
export const AboutScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
    <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: 40, paddingHorizontal: 20 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => navigation.goBack()} style={styles.back} hitSlop={6}>
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </Pressable>
      <Text style={styles.largeTitle}>About & Credits</Text>
      <View style={{ padding: ui.space.lg, borderRadius: 14, backgroundColor: colors.appleCard, gap: ui.space.md }}>
        <Text style={{ fontSize: ui.type.heading, fontWeight: '700', color: colors.textPrimary }}>Velora</Text>
        <Text style={styles.hint}>Track movies and TV series, reviews and episode progress.</Text>
        <Pressable accessibilityRole="link" accessibilityLabel="The Movie Database" onPress={() => Linking.openURL('https://www.themoviedb.org')}>
          <Image source={require('../../../assets/credits/tmdb-logo.png')} resizeMode="contain" style={{ width: 110, height: 45, alignSelf: 'flex-start' }} />
        </Pressable>
        <Text style={{ fontSize: 13, lineHeight: 19, color: colors.textPrimary }}>This product uses the TMDB API but is not endorsed or certified by TMDB.</Text>
      </View>

    </ScrollView>
    </View>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: 0.3, color: colors.appleText, marginBottom: 14 },
  back: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, marginBottom: 8 },
  hint: { fontSize: ui.type.label, color: colors.textSecondary, marginTop: 3, lineHeight: 17 },
});
