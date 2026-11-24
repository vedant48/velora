import { CachedImage as Image } from '../../experience/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useWatchProvidersQuery } from '../../api/queries';
import { WatchProvider } from '../../api/types';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { metrics } from '../../theme/metrics';
import { getPosterUrl } from '../../utils/image';

interface WatchProvidersProps {
  id: number;
  isMovie: boolean;
}

interface ListedProvider {
  provider: WatchProvider;
  subscription: boolean;
}

const ProviderLogo = ({ provider, size }: { provider: WatchProvider; size: number }) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const logoUrl = getPosterUrl(provider.logo_path, 'w185');
  const circle = { width: size, height: size, borderRadius: size / 2 };
  if (logoUrl) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={[circle, { backgroundColor: colors.surfaceLight }]}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
        accessibilityLabel={provider.provider_name}
      />
    );
  }
  return (
    <View style={[circle, { backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: size * 0.34 }}>
        {provider.provider_name.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
};

/**
 * Must-style Watch online (owner rule, 25 Nov, reference screenshots): one compact row with a
 * play glyph and trailing provider logos; tapping opens a sheet listing every provider with its
 * logo and name. "Subscription" shows only on flatrate entries, as in the reference. Provider
 * facts come from TMDB watch/providers for the user's region (IN first), never invented.
 */
export const WatchProviders = memo(({ id, isMovie }: WatchProvidersProps) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { data, isLoading } = useWatchProvidersQuery(id, isMovie);
  const [sheetVisible, setSheetVisible] = useState(false);

  const providers = useMemo<ListedProvider[]>(() => {
    const region =
      data?.results?.['IN'] ||
      data?.results?.['US'] ||
      data?.results?.['GB'] ||
      (data?.results ? Object.values(data.results)[0] : undefined);
    if (!region) return [];
    const subscriptionIds = new Set((region.flatrate ?? []).map(p => p.provider_id));
    const byId = new Map<number, WatchProvider>();
    for (const list of [region.flatrate ?? [], region.rent ?? [], region.buy ?? []]) {
      for (const p of list) if (!byId.has(p.provider_id)) byId.set(p.provider_id, p);
    }
    return [...byId.values()]
      .sort((a, b) => a.display_priority - b.display_priority)
      .map(provider => ({ provider, subscription: subscriptionIds.has(provider.provider_id) }));
  }, [data]);

  if (isLoading || providers.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.row}
        onPress={() => setSheetVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Watch online: show all providers"
      >
        <View style={styles.playCircle}>
          <Ionicons name="play" size={13} color={colors.textPrimary} />
        </View>
        <Text style={styles.rowTitle}>Watch online</Text>
        <View style={styles.rowSpacer} />
        <View style={styles.logoRow}>
          {providers.slice(0, 4).map(({ provider }) => (
            <ProviderLogo key={provider.provider_id} provider={provider} size={26} />
          ))}
        </View>
      </Pressable>

      <Modal visible={sheetVisible} transparent animationType="slide" onRequestClose={() => setSheetVisible(false)}>
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetScrim} accessibilityLabel="Close watch providers" onPress={() => setSheetVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <ScrollView bounces={false}>
              {providers.map(({ provider, subscription }, index) => (
                <View key={provider.provider_id} style={[styles.sheetRow, index > 0 && styles.sheetRowDivider]}>
                  <ProviderLogo provider={provider} size={56} />
                  <View style={styles.sheetText}>
                    <Text style={styles.sheetName}>{provider.provider_name}</Text>
                    {subscription && <Text style={styles.sheetSub}>Subscription</Text>}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    marginTop: metrics.spacingLg,
    marginBottom: metrics.spacingMd,
    paddingHorizontal: metrics.screenHorizontalPadding,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  playCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowSpacer: { flex: 1 },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.72)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 10,
    paddingBottom: 34,
    maxHeight: '70%',
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceBorder,
    marginBottom: 14,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: metrics.screenHorizontalPadding,
    paddingVertical: 14,
  },
  sheetRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sheetText: { marginLeft: 18 },
  sheetName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sheetSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
  },
});
