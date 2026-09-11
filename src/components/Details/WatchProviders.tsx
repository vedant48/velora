import React, { memo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useWatchProvidersQuery } from '../../api/queries';
import { WatchProvider } from '../../api/types';
import { getPosterUrl } from '../../utils/image';
import { colors } from '../../theme/colors';
import { metrics } from '../../theme/metrics';

interface WatchProvidersProps {
  id: number;
  isMovie: boolean;
}

interface ProviderBadgeProps {
  provider: WatchProvider;
}

const ProviderBadge = memo(({ provider }: ProviderBadgeProps) => {
  const logoUrl = getPosterUrl(provider.logo_path, 'w185');

  return (
    <View style={styles.badgeContainer}>
      <View style={styles.logoWrapper}>
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={styles.logoImage}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.placeholderLogo}>
            <Text style={styles.placeholderText}>
              {provider.provider_name.slice(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.providerName} numberOfLines={1}>
        {provider.provider_name}
      </Text>
    </View>
  );
});

export const WatchProviders = memo(({ id, isMovie }: WatchProvidersProps) => {
  const { data, isLoading } = useWatchProvidersQuery(id, isMovie);

  if (isLoading || !data?.results) {
    return null;
  }

  // Priority: India (IN) -> United States (US) -> First available country
  const regionData =
    data.results['IN'] ||
    data.results['US'] ||
    data.results['GB'] ||
    Object.values(data.results)[0];

  if (!regionData) {
    return null;
  }

  const { flatrate = [], rent = [], buy = [] } = regionData;

  const hasAnyProviders = flatrate.length > 0 || rent.length > 0 || buy.length > 0;
  if (!hasAnyProviders) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Where to Watch</Text>
        <View style={styles.hdBadge}>
          <Text style={styles.hdText}>STREAMING PARTNERS</Text>
        </View>
      </View>

      {flatrate.length > 0 && (
        <View style={styles.providerGroup}>
          <Text style={styles.groupLabel}>Stream</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {flatrate.map((provider) => (
              <ProviderBadge
                key={`stream-${provider.provider_id}`}
                provider={provider}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {rent.length > 0 && (
        <View style={styles.providerGroup}>
          <Text style={styles.groupLabel}>Rent</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {rent.map((provider) => (
              <ProviderBadge
                key={`rent-${provider.provider_id}`}
                provider={provider}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {buy.length > 0 && (
        <View style={styles.providerGroup}>
          <Text style={styles.groupLabel}>Buy</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {buy.map((provider) => (
              <ProviderBadge
                key={`buy-${provider.provider_id}`}
                provider={provider}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: metrics.spacingLg,
    marginBottom: metrics.spacingMd,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: metrics.screenHorizontalPadding,
    marginBottom: metrics.spacingSm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  hdBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  hdText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  providerGroup: {
    marginTop: metrics.spacingSm,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    paddingHorizontal: metrics.screenHorizontalPadding,
    marginBottom: metrics.spacingXs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: metrics.screenHorizontalPadding,
    gap: 12,
  },
  badgeContainer: {
    alignItems: 'center',
    width: 68,
  },
  logoWrapper: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  placeholderLogo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceBorder,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  providerName: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
});
