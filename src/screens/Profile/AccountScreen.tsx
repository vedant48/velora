import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { veloraApi } from '../../api/velora';
import { ActionSheet } from '../../components/Library/ActionSheet';
import { Avatar } from '../../components/Avatar';
import { useAuth } from '../../state/AuthContext';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { ui } from '../../theme/ui';
import { useUpdateCheck } from './useUpdateCheck';

/** Rounded grey icon tile at the start of a settings row (matches the approved settings mock). */
const IconTile: React.FC<{ name: React.ComponentProps<typeof Ionicons>['name'] }> = ({ name }) => {
  const { colors } = useAppTheme();
  return (
    <View style={{ width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.appleFill }}>
      <Ionicons name={name} size={18} color={colors.textPrimary} />
    </View>
  );
};

/** Account settings: profile edit, privacy, data export, account deletion. */
export const AccountScreen: React.FC = () => {
  const { colors, preference, setPreference } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();

  const [isPrivate, setIsPrivate] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [themeSheet, setThemeSheet] = useState(false);
  const [exportSheet, setExportSheet] = useState(false);
  const update = useUpdateCheck();
  const version = Constants.expoConfig?.version ?? '';

  useEffect(() => {
    if (!user) return;
    veloraApi
      .getUser(user.username)
      .then((r) => setIsPrivate(r.isPrivate ?? false))
      .catch(() => undefined);
  }, [user]);

  const togglePrivate = useCallback(
    async (value: boolean) => {
      setIsPrivate(value);
      try {
        await veloraApi.updateMe({ isPrivate: value });
      } catch (e: any) {
        setIsPrivate(!value);
        Alert.alert('Could not update privacy', e?.message ?? 'Try again later.');
      }
    },
    [],
  );

  const exportData = useCallback(async (format: 'velora' | 'simkl') => {
    if (busy) return;
    setBusy(format);
    try {
      let filename: string;
      let contents: string;
      if (format === 'simkl') {
        const res = await veloraApi.exportLibraryCsv();
        filename = res.filename;
        contents = res.csv;
      } else {
        const res = await veloraApi.exportLibrary('velora');
        filename = `velora-export-${new Date().toISOString().slice(0, 10)}.json`;
        contents = JSON.stringify(res, null, 2);
      }
      const path = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(path, contents);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { dialogTitle: 'Export your Velora library' });
      } else {
        Alert.alert('Export ready', `Saved to ${path}`);
      }
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Try again later.');
    } finally {
      setBusy(null);
    }
  }, [busy]);

  const shareProfile = useCallback(() => {
    if (!user) return;
    Share.share({ message: `Follow me on Velora: @${user.username}` }).catch(() => undefined);
  }, [user]);

  const deleteAccount = useCallback(() => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account, library, reviews and follows. Export first if you want a copy.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you sure?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Yes, delete my account',
                style: 'destructive',
                onPress: () => {
                  veloraApi
                    .deleteMe()
                    .then(() => logout())
                    .catch((e: any) => Alert.alert('Deletion failed', e?.message ?? 'Try again later.'));
                },
              },
            ]),
        },
      ],
    );
  }, [logout]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
    <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: 40, paddingHorizontal: 20 }}>
      {/* Gallery settings mock: iOS large title. The back circle stays (functional difference
          from the mock, which omits it) so the pushed screen keeps its exit. */}
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => navigation.goBack()} style={styles.back} hitSlop={6}>
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </Pressable>
      <Text style={styles.largeTitle}>Settings</Text>

      <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={() => navigation.navigate('EditProfile')} style={styles.group}>
        <View style={styles.profileRow}>
          {user ? <Avatar user={user} size={52} /> : null}
          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>{user?.displayName || user?.username}</Text>
            <Text style={styles.profileSub}>@{user?.username}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.appleText3} />
        </View>
      </Pressable>
      <View style={[styles.group, { marginTop: 22 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Appearance" onPress={() => setThemeSheet(true)} style={styles.setrow}>
          <IconTile name="contrast-outline" />
          <Text style={styles.setrowLabel}>Appearance</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.detail}>{preference[0].toUpperCase() + preference.slice(1)}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.appleText3} />
        </Pressable>
        <View style={styles.sep} />
        <View style={styles.setrow}>
          <IconTile name="eye-off-outline" />
          <View style={{ flex: 1 }}>
            <Text style={styles.setrowLabel}>Private account</Text>
            <Text style={styles.rowHint}>Other members can find your profile, but only you can see your library and stats.</Text>
          </View>
          <Switch value={isPrivate} onValueChange={togglePrivate} trackColor={{ false: colors.appleFill, true: '#30D158' }} thumbColor="#fff" />
        </View>
      </View>

      <View style={[styles.group, { marginTop: 22 }]}>
        <Pressable testID="settings-import-must" onPress={() => navigation.navigate('ImportMust')} style={styles.setrow} disabled={busy !== null} accessibilityRole="button">
          <IconTile name="cloud-upload-outline" />
          <Text style={styles.setrowLabel}>Import from Must</Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={16} color={colors.appleText3} />
        </Pressable>
        <View style={styles.sep} />
        <Pressable accessibilityRole="button" accessibilityLabel="Export your data" onPress={() => setExportSheet(true)} style={styles.setrow} disabled={busy !== null}>
          <IconTile name="document-outline" />
          <Text style={styles.setrowLabel}>{busy ? 'Preparing...' : 'Export your data'}</Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={16} color={colors.appleText3} />
        </Pressable>
        <View style={styles.sep} />
        <Pressable accessibilityRole="button" accessibilityLabel="Check for updates" onPress={update.run} style={styles.setrow}>
          <IconTile name="refresh-outline" />
          <Text style={styles.setrowLabel}>Check for updates</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.detail}>{update.progress === null ? `v${version}` : `Downloading ${Math.round(update.progress * 100)}%`}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.appleText3} />
        </Pressable>
      </View>

      <View style={[styles.group, { marginTop: 22 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Share profile" onPress={shareProfile} style={styles.setrow}>
          <IconTile name="share-outline" />
          <Text style={styles.setrowLabel}>Share profile</Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={16} color={colors.appleText3} />
        </Pressable>
        <View style={styles.sep} />
        <Pressable accessibilityRole="button" accessibilityLabel="Activity" onPress={() => navigation.navigate('Activity')} style={styles.setrow}>
          <IconTile name="pulse-outline" />
          <Text style={styles.setrowLabel}>Activity</Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={16} color={colors.appleText3} />
        </Pressable>
      </View>

      <View style={[styles.group, { marginTop: 22 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="About and credits" onPress={() => navigation.navigate('About')} style={styles.setrow}>
          <Text style={styles.setrowLabel}>About & Credits</Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={16} color={colors.appleText3} />
        </Pressable>
      </View>

      <View style={[styles.group, { marginTop: 22 }]}>
        <Pressable
          onPress={() => Alert.alert('Log out?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: () => void logout() }])}
          style={styles.setrow}
          accessibilityRole="button"
        >
          <Text style={[styles.setrowLabel, { color: colors.error }]}>Log out</Text>
        </Pressable>
        <View style={styles.sep} />
        <Pressable onPress={deleteAccount} style={styles.setrow} accessibilityRole="button">
          <Text style={[styles.setrowLabel, { color: colors.error }]}>Delete account</Text>
        </Pressable>
      </View>

      {/* Gallery settings mock footnote: factual attribution to the app owner, a routine design decision within the approved gallery. */}
      <Text style={styles.footnote}>Velora for Android · made by Vedant</Text>
      <ActionSheet visible={exportSheet} onClose={() => setExportSheet(false)} options={[
        { label: 'Velora library (JSON)', onPress: () => void exportData('velora') },
        { label: 'SIMKL (CSV)', onPress: () => void exportData('simkl') },
      ]} />
      <ActionSheet visible={themeSheet} onClose={() => setThemeSheet(false)} options={(['system', 'light', 'dark'] as const).map(choice => ({
        label: `${choice[0].toUpperCase()}${choice.slice(1)}${preference === choice ? '  ✓' : ''}`,
        onPress: () => { setPreference(choice).catch(() => Alert.alert('Theme not saved', 'Try again. Your previous choice is unchanged.')); },
      }))} />
    </ScrollView>
    </View>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  themeChoice: { flex: 1, borderWidth: 1, borderColor: colors.surfaceBorder, paddingVertical: 13, alignItems: 'center', borderRadius: 8 },
  photoRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  removePhoto: { color: colors.primary, fontSize: ui.type.body, fontWeight: '600', marginTop: 10, alignSelf: 'flex-start' },
  readonly: { color: colors.textSecondary, paddingVertical: ui.space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  root: { flex: 1, backgroundColor: colors.background },
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: 0.3, color: colors.appleText, marginBottom: 14 },
  detail: { fontSize: 16, color: colors.appleText2 },
  footnote: { textAlign: 'center', color: colors.appleText2, fontSize: 13, marginTop: 28 },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginBottom: ui.space.sm,
  },
  title: { fontSize: ui.type.screenTitle, fontWeight: '800', color: colors.textPrimary, marginBottom: 10 },
  section: { fontSize: 13, fontWeight: '600', color: colors.appleText2, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 22, marginBottom: 8, marginLeft: 4 },
  group: { backgroundColor: colors.appleCard, borderRadius: 14, overflow: 'hidden' },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.appleSeparator, marginLeft: 14 },
  setrow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 13 },
  setrowLabel: { fontSize: 16, fontWeight: '400', color: colors.textPrimary, flexShrink: 1 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  profileMeta: { flex: 1, gap: 1 },
  profileName: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  profileSub: { fontSize: 13, color: colors.appleText2 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 6 },
  fieldLabel: { width: 76, fontSize: 16, color: colors.textPrimary },
  fieldValue: { fontSize: 16, color: colors.appleText2 },
  fieldInput: { flex: 1, color: colors.textPrimary, fontSize: 16, paddingVertical: 8 },
  input: {
    borderRadius: ui.radius.button,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: ui.space.md,
    color: colors.textPrimary,
    fontSize: ui.type.body,
    marginBottom: 10,
  },
  bioInput: { minHeight: 76, textAlignVertical: 'top' },
  button: { borderRadius: ui.radius.button, backgroundColor: colors.primary, paddingVertical: 13, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: ui.type.body },
  row: { flexDirection: 'row', alignItems: 'center', gap: ui.space.md, backgroundColor: colors.surface, borderRadius: ui.radius.button, padding: 14 },
  rowLabel: { fontSize: ui.type.body, fontWeight: '700', color: colors.textPrimary },
  rowHint: { fontSize: ui.type.label, color: colors.textSecondary, marginTop: 3, lineHeight: 17 },
  rowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: ui.radius.button,
    padding: 14,
    marginBottom: ui.space.sm,
  },
  rowButtonText: { fontSize: ui.type.body, fontWeight: '700', color: colors.textPrimary },
  danger: { borderWidth: 1, borderColor: colors.error },
});
