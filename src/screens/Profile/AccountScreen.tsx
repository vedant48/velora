import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { veloraApi } from '../../api/velora';
import { AppButton } from '../../components/common/AppButton';
import { AppTextField } from '../../components/common/AppTextField';
import { ScreenHeader } from '../../components/common/ScreenHeader';
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
      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />

      <View style={styles.avatar}><Text style={styles.avatarLetter}>{user?.displayName?.[0]?.toUpperCase() ?? 'V'}</Text></View>
      <Text style={styles.section}>Name</Text>
      <AppTextField
        accessibilityLabel="Display name"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Display name"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        maxLength={50}
      />
      <Text style={styles.section}>Username</Text>
      <Text style={styles.readonly}>{user?.username}</Text>
      <Text style={styles.section}>Bio</Text>
      <AppTextField
        accessibilityLabel="Bio"
        value={bio}
        onChangeText={setBio}
        placeholder="Bio"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, styles.bioInput]}
        maxLength={300}
        multiline
      />
      <AppButton title="Save profile" onPress={saveProfile} loading={saving} />

      <Text style={styles.section}>Appearance</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Appearance" style={{ flexDirection: 'row', gap: 8 }}>
        {(['system', 'light', 'dark'] as const).map(choice => (
          <Pressable key={choice} accessibilityRole="radio" accessibilityLabel={`${choice[0].toUpperCase()}${choice.slice(1)} theme`}
            accessibilityState={{ checked: preference === choice }} aria-checked={preference === choice}
            onPress={() => setPreference(choice).catch(() => Alert.alert('Theme not saved', 'Try again. Your previous choice is unchanged.'))}
            style={[styles.themeChoice, preference === choice && { borderColor: colors.primary, backgroundColor: colors.surfaceLight }]}>
            <Text style={{ color: colors.textPrimary, fontWeight: preference === choice ? '700' : '400' }}>{choice[0].toUpperCase() + choice.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.rowHint, { marginTop: 8 }]}>System follows your device appearance.</Text>

      <Text style={styles.section}>Privacy</Text>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>Private account</Text>
          <Text style={styles.rowHint}>
            Other members can find your profile, but only you can see your library and stats.
          </Text>
        </View>
        <Switch
          value={isPrivate}
          onValueChange={togglePrivate}
          trackColor={{ false: colors.surfaceLight, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <Text style={styles.section}>Your data</Text>
      <Pressable onPress={() => exportData('velora')} style={styles.rowButton} disabled={busy !== null}>
        <Ionicons name="download-outline" size={17} color={colors.textPrimary} />
        <Text style={styles.rowButtonText}>{busy === 'velora' ? 'Preparing...' : 'Export library (JSON)'}</Text>
      </Pressable>
      <Pressable onPress={() => exportData('simkl')} style={styles.rowButton} disabled={busy !== null}>
        <Ionicons name="download-outline" size={17} color={colors.textPrimary} />
        <Text style={styles.rowButtonText}>{busy === 'simkl' ? 'Preparing...' : 'Export library (SIMKL CSV)'}</Text>
      </Pressable>

      <Text style={styles.section}>Danger zone</Text>
      <Pressable onPress={deleteAccount} style={[styles.rowButton, styles.danger]}>
        <Ionicons name="trash-outline" size={17} color={colors.error} />
        <Text style={[styles.rowButtonText, { color: colors.error }]}>Delete account</Text>
      </Pressable>
    </ScrollView>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  themeChoice: { flex: 1, borderWidth: 1, borderColor: colors.surfaceBorder, paddingVertical: 13, alignItems: 'center', borderRadius: 8 },
  avatar: { alignSelf: 'center', width: 78, height: 78, borderRadius: 39, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginVertical: 18 },
  avatarLetter: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
  readonly: { color: colors.textSecondary, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  root: { flex: 1, backgroundColor: colors.background },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  title: { fontSize: ui.type.screenTitle, fontWeight: '800', color: colors.textPrimary, marginBottom: 10 },
  section: { fontSize: 13, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 22, marginBottom: 10 },
  input: {
    borderRadius: ui.radius.button,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: 10,
  },
  bioInput: { minHeight: 76, textAlignVertical: 'top' },
  button: { borderRadius: ui.radius.button, backgroundColor: colors.primary, paddingVertical: 13, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: ui.radius.button, padding: 14 },
  rowLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  rowHint: { fontSize: 12, color: colors.textSecondary, marginTop: 3, lineHeight: 17 },
  rowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: ui.radius.button,
    padding: 14,
    marginBottom: 8,
  },
  rowButtonText: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  danger: { borderWidth: 1, borderColor: colors.error },
});
