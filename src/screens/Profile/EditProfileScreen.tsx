import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { veloraApi } from '../../api/velora';
import { AppButton } from '../../components/common/AppButton';
import { AppTextField } from '../../components/common/AppTextField';
import { Avatar } from '../../components/Avatar';
import { useAuth } from '../../state/AuthContext';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';

/** Edit profile: photo, name and bio. Opened from the profile card at the top of Settings. */
export const EditProfileScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, refresh } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [saving, setSaving] = useState(false);
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

  // Status-bar safe area: content scrolls inside a box that starts below the inset, so nothing paints behind the clock.
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
    <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: 40, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => navigation.goBack()} style={styles.back} hitSlop={6}>
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </Pressable>
      <Text style={styles.largeTitle}>Edit profile</Text>
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
      <View style={{ height: 22 }} />
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

    </ScrollView>
    </View>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: 0.3, color: colors.appleText, marginBottom: 14 },
  back: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, marginBottom: 8 },
  group: { backgroundColor: colors.appleCard, borderRadius: 14, overflow: 'hidden' },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.appleSeparator, marginLeft: 14 },
  setrow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 13 },
  setrowLabel: { fontSize: 16, color: colors.textPrimary, flexShrink: 1 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  profileMeta: { flex: 1, gap: 1 },
  profileName: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  profileSub: { fontSize: 13, color: colors.appleText2 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 6 },
  fieldLabel: { width: 76, fontSize: 16, color: colors.textPrimary },
  fieldValue: { fontSize: 16, color: colors.appleText2 },
  fieldInput: { flex: 1, color: colors.textPrimary, fontSize: 16, paddingVertical: 8 },
  bioInput: { minHeight: 76, textAlignVertical: 'top' },
  section: { fontSize: 13, fontWeight: '600', color: colors.appleText2, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 22, marginBottom: 8, marginLeft: 4 },
});
