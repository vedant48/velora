import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { metrics } from '../../theme/metrics';

export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [wifiOnly, setWifiOnly] = React.useState(true);
  const [autoPlayNext, setAutoPlayNext] = React.useState(true);
  const [spatialAudio, setSpatialAudio] = React.useState(true);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>V</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Vedant</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>VELORA ULTRA 4K</Text>
            </View>
          </View>
        </View>

        {/* Streaming & Video Preferences */}
        <Text style={styles.sectionTitle}>Playback & Video Quality</Text>
        <View style={styles.settingsGroup}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconCircle}>
              <Ionicons name="tv-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Streaming Quality</Text>
              <Text style={styles.settingSubLabel}>4K Ultra HD & Dolby Vision</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIconCircle}>
              <Ionicons name="wifi-outline" size={18} color={colors.accentCyan} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Download on Wi-Fi Only</Text>
              <Text style={styles.settingSubLabel}>Save mobile cellular data</Text>
            </View>
            <Switch
              value={wifiOnly}
              onValueChange={setWifiOnly}
              trackColor={{ false: colors.surfaceLight, true: colors.primary }}
              thumbColor="#FFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIconCircle}>
              <Ionicons name="headset-outline" size={18} color={colors.accentPurple} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Spatial Audio</Text>
              <Text style={styles.settingSubLabel}>Dolby Atmos 7.1 Surround</Text>
            </View>
            <Switch
              value={spatialAudio}
              onValueChange={setSpatialAudio}
              trackColor={{ false: colors.surfaceLight, true: colors.primary }}
              thumbColor="#FFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIconCircle}>
              <Ionicons name="play-skip-forward-outline" size={18} color={colors.accentAmber} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Autoplay Next Episode</Text>
              <Text style={styles.settingSubLabel}>Continuous streaming experience</Text>
            </View>
            <Switch
              value={autoPlayNext}
              onValueChange={setAutoPlayNext}
              trackColor={{ false: colors.surfaceLight, true: colors.primary }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* Offline Storage */}
        <Text style={styles.sectionTitle}>Device Storage</Text>
        <View style={styles.settingsGroup}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconCircle}>
              <Ionicons name="cloud-download-outline" size={18} color={colors.success} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Offline Downloads</Text>
              <Text style={styles.settingSubLabel}>3.2 GB of 64 GB used</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </View>
        </View>

        {/* App Info & Diagnostics */}
        <Text style={styles.sectionTitle}>Application</Text>
        <View style={styles.settingsGroup}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconCircle}>
              <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Velora Version</Text>
              <Text style={styles.settingSubLabel}>1.0.0 (Production Build)</Text>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <Pressable style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: metrics.screenHorizontalPadding,
    paddingBottom: 60,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '800',
  },
  userInfo: {
    gap: 6,
  },
  userName: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  planBadge: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    borderWidth: 0.5,
    borderColor: colors.primary,
  },
  planBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  settingsGroup: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  settingIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextCol: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  settingSubLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  signOutButton: {
    marginTop: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  signOutText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '700',
  },
});
