import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { checkForUpdate, downloadAndInstall } from '../../services/updates';

/** In-app updater flow, shared by the Settings screen. progress is null while idle. */
export function useUpdateCheck() {
  const [progress, setProgress] = useState<number | null>(null);

  const run = useCallback(async () => {
    if (progress !== null) return;
    try {
      const info = await checkForUpdate();
      if (!info) {
        Alert.alert('Update check failed', 'Could not reach the update server. Try again later.');
        return;
      }
      if (!info.isNewer) {
        Alert.alert('Velora is up to date', `You are on the latest version (${info.currentVersion}).`);
        return;
      }
      const notes = info.notes ? info.notes.slice(0, 300) : 'A new version is available.';
      Alert.alert(`Update available: v${info.latestVersion}`, notes, [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Download & install',
          onPress: () => {
            setProgress(0);
            void downloadAndInstall(info, setProgress).then((r) => {
              setProgress(null);
              if (!r.ok) {
                Alert.alert('Update failed', r.error ?? 'Something went wrong');
              } else {
                Alert.alert('Ready to install', 'Android will ask you to confirm the update.');
              }
            });
          },
        },
      ]);
    } catch {
      Alert.alert('Update check failed', 'Could not reach the update server. Try again later.');
    }
  }, [progress]);

  return { progress, run };
}
