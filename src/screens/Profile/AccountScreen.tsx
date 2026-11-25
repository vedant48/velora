import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { veloraApi } from '../../api/velora';
import { AppButton } from '../../components/common/AppButton';
import { AppTextField } from '../../components/common/AppTextField';
import { Avatar } from '../../components/Avatar';
import { useAuth } from '../../state/AuthContext';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { ui } from '../../theme/ui';

/** Account settings: profile edit, privacy, data export, account deletion. */
export const AccountScreen: React.FC = () => {
  const { colors, preference, setPreference } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, logout, refresh } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const changePhoto = useCallback(async () => {
    if (photoBusy) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Photos access needed', 'Allow photo access to choose a profile picture.');
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      const asset = picked.assets?.[0];
      if (picked.canceled || !asset) return;
      setPhotoBusy(true);
      const prepared = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 256 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      await veloraApi.uploadAvatar(prepared.uri);
      await refresh();
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Try again later.');
    } finally {
      setPhotoBusy(false);
    }
  }, [photoBusy, refresh]);

  const removePhoto = useCallback(() => {
    Alert.alert('Remove photo', 'Remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setPhotoBusy(true);
          veloraApi
            .removeAvatar()
            .then(() => refresh())
            .catch((e: any) => Alert.alert('Could not remove photo', e?.message ?? 'Try again later.'))
            .finally(() => setPhotoBusy(false));
        },
      },
    ]);
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    veloraApi
      .getUser(user.username)
      .then((r) => setIsPrivate(r.isPrivate ?? false))
      .catch(() => undefined);
  }, [user]);

  const saveProfile = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await veloraApi.updateMe({ displayName: displayName.trim(), bio: bio.trim() });
      await refresh();
      Alert.alert('Saved', 'Your profile was updated.');
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Try again later.');
    } finally {
      setSaving(false);
    }
  }, [saving, displayName, bio, refresh]);

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
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40, paddingHorizontal: 20 }}
    >
      {/* Gallery settings mock: iOS large title. The back circle stays (functional difference
          from the mock, which omits it) so the pushed screen keeps its exit. */}
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => navigation.goBack()} style={styles.back} hitSlop={6}>
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </Pressable>
      <Text style={styles.largeTitle}>Settings</Text>

      {/* Apple redesign: iOS grouped settings - identity + photo actions */}
      <View style={styles.group}>
        <View style={styles.profileRow}>
          {user ? (
            <>
              <Avatar user={user} size={52} />
              <View style={styles.profileMeta}>
                <Text style={styles.profileName}>{user.displayName || user.username}</Text>
                <Text style={styles.profileSub}>@{user.username}</Text>
              </View>
            </>
          ) : null}
        </View>
        <View style={styles.sep} />
        <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" onPress={changePhoto} disabled={photoBusy} style={styles.setrow}>
          <Text style={styles.setrowLabel}>{photoBusy ? 'Uploading...' : 'Change photo'}</Text>
        </Pressable>
        {user?.avatarAt ? (
          <>
            <View style={styles.sep} />
            <Pressable accessibilityRole="button" accessibilityLabel="Remove profile photo" onPress={removePhoto} disabled={photoBusy} style={styles.setrow}>
              <Text style={styles.setrowLabel}>Remove photo</Text>
            </Pressable>
          </>
        ) : null}
      </View>
      <Text style={styles.section}>Profile</Text>
      <View style={styles.group}>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Name</Text>
          <AppTextField
            accessibilityLabel="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Display name"
            placeholderTextColor={colors.appleText3}
            style={styles.fieldInput}
            maxLength={50}
          />
        </View>
        <View style={styles.sep} />
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Username</Text>
          <Text style={styles.fieldValue}>{user?.username}</Text>
        </View>
        <View style={styles.sep} />
        <View style={[styles.fieldRow, { alignItems: 'flex-start' }]}>
          <Text style={styles.fieldLabel}>Bio</Text>
          <AppTextField
            accessibilityLabel="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Bio"
            placeholderTextColor={colors.appleText3}
            style={[styles.fieldInput, styles.bioInput]}
            maxLength={300}
            multiline
          />
        </View>
      </View>
      <AppButton title="Save profile" onPress={saveProfile} loading={saving} />

      <Text style={styles.section}>Appearance</Text>
      <View style={[styles.group, { padding: 10 }]}>
        <View accessibilityRole="radiogroup" accessibilityLabel="Appearance" style={{ flexDirection: 'row', gap: ui.space.sm }}>
        {(['system', 'light', 'dark'] as const).map(choice => (
          <Pressable key={choice} accessibilityRole="radio" accessibilityLabel={`${choice[0].toUpperCase()}${choice.slice(1)} theme`}
            accessibilityState={{ checked: preference === choice }} aria-checked={preference === choice}
            onPress={() => setPreference(choice).catch(() => Alert.alert('Theme not saved', 'Try again. Your previous choice is unchanged.'))}
            style={[styles.themeChoice, preference === choice && { borderColor: colors.primary, backgroundColor: colors.surfaceLight }]}>
            <Text style={{ color: colors.textPrimary, fontWeight: preference === choice ? '700' : '400' }}>{choice[0].toUpperCase() + choice.slice(1)}</Text>
          </Pressable>
        ))}
        </View>
      </View>
      <Text style={[styles.rowHint, { marginTop: ui.space.sm }]}>System follows your device appearance.</Text>

      <Text style={styles.section}>Privacy</Text>
      <View style={styles.group}>
        <View style={styles.setrow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.setrowLabel}>Private account</Text>
            <Text style={styles.rowHint}>
              Other members can find your profile, but only you can see your library and stats.
            </Text>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={togglePrivate}
            trackColor={{ false: colors.appleFill, true: '#30D158' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <Text style={styles.section}>Your data</Text>
      <View style={styles.group}>
        <Pressable testID="settings-import-must" onPress={() => navigation.navigate('ImportMust')} style={styles.setrow} disabled={busy !== null} accessibilityRole="button">
          <Ionicons name="cloud-upload-outline" size={18} color={colors.textPrimary} />
          <Text style={styles.setrowLabel}>Import from Must</Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={16} color={colors.appleText3} />
        </Pressable>
        <View style={styles.sep} />
        <Pressable onPress={() => exportData('velora')} style={styles.setrow} disabled={busy !== null} accessibilityRole="button">
          <Ionicons name="download-outline" size={18} color={colors.textPrimary} />
          <Text style={styles.setrowLabel}>{busy === 'velora' ? 'Preparing...' : 'Export library (JSON)'}</Text>
        </Pressable>
        <View style={styles.sep} />
        <Pressable onPress={() => exportData('simkl')} style={styles.setrow} disabled={busy !== null} accessibilityRole="button">
          <Ionicons name="download-outline" size={18} color={colors.textPrimary} />
          <Text style={styles.setrowLabel}>{busy === 'simkl' ? 'Preparing...' : 'Export library (SIMKL CSV)'}</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>About & Credits</Text>
      <View style={{ padding: ui.space.lg, borderRadius: 14, backgroundColor: colors.appleCard, gap: ui.space.md }}>
        <Text style={{ fontSize: ui.type.heading, fontWeight: '700', color: colors.textPrimary }}>Velora</Text>
        <Text style={styles.rowHint}>Track movies and TV series, reviews and episode progress.</Text>
        <Pressable accessibilityRole="link" accessibilityLabel="The Movie Database" onPress={() => Linking.openURL('https://www.themoviedb.org')}>
          <Image source={require('../../../assets/credits/tmdb-logo.png')} resizeMode="contain" style={{ width: 110, height: 45, alignSelf: 'flex-start' }} />
        </Pressable>
        <Text style={{ fontSize: 13, lineHeight: 19, color: colors.textPrimary }}>This product uses the TMDB API but is not endorsed or certified by TMDB.</Text>
      </View>

      <Text style={styles.section}>Danger zone</Text>
      <View style={styles.group}>
        <Pressable
          onPress={() => Alert.alert('Log out?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: () => void logout() }])}
          style={styles.setrow}
          accessibilityRole="button"
        >
          <Text style={[styles.setrowLabel, { color: colors.error }]}>Log out</Text>
        </Pressable>
        <View style={styles.sep} />
        <Pressable onPress={deleteAccount} style={styles.setrow} accessibilityRole="button">
          <Ionicons name="trash-outline" size={17} color={colors.error} />
          <Text style={[styles.setrowLabel, { color: colors.error }]}>Delete account</Text>
        </Pressable>
      </View>

      {/* Gallery settings mock footnote (owner-confirmed credit line). */}
      <Text style={styles.footnote}>Velora for Android · made by Vedant</Text>
    </ScrollView>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  themeChoice: { flex: 1, borderWidth: 1, borderColor: colors.surfaceBorder, paddingVertical: 13, alignItems: 'center', borderRadius: 8 },
  photoRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  removePhoto: { color: colors.primary, fontSize: ui.type.body, fontWeight: '600', marginTop: 10, alignSelf: 'flex-start' },
  readonly: { color: colors.textSecondary, paddingVertical: ui.space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  root: { flex: 1, backgroundColor: colors.background },
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: 0.3, color: colors.appleText, marginBottom: 14 },
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
