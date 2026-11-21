import { Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import * as IntentLauncher from 'expo-intent-launcher';

const REPO = 'vedant48/velora';
const RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`;
const APK_MIME = 'application/vnd.android.package-archive';

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  isNewer: boolean;
  notes: string;
  apkUrl: string | null;
  apkName: string | null;
  apkSize: number | null;
  /** Expected SHA-256 of the APK, from the release's checksums.txt asset. */
  expectedSha256: string | null;
  releaseUrl: string;
}

interface GhAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

/** Semver-ish compare: returns >0 when a > b. Non-numeric parts are ignored. */
function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/i, '').split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.replace(/^v/i, '').split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * Checks GitHub Releases for a newer APK. Integrity model:
 * - version comes from the release tag, compared with the installed version;
 * - the APK asset is matched by name pattern, and its SHA-256 is verified
 *   against the checksums.txt asset published by our own CI before install;
 * - the release's cert-fingerprint.txt must match this build's own signing
 *   certificate (injected at build time as extra.certSha256): a build signed
 *   with a different key is never offered as an in-app update, so e.g. a
 *   migration-bridge install is not prompted to "update" to a final build it
 *   cannot install over itself - that transition is a guided reinstall;
 * - Android PackageManager additionally enforces that an update is signed by
 *   the same certificate and has the same package name, so a tampered or
 *   differently-signed APK cannot install over the app.
 */
function normalizeCertSha256(v: string | null | undefined): string | null {
  if (!v) return null;
  const hex = v.replace(/[^0-9a-f]/gi, '').toUpperCase();
  return hex.length === 64 ? hex : null;
}
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (Platform.OS !== 'android') return null;
  const currentVersion = Application.nativeApplicationVersion ?? '0.0.0';

  const res = await fetch(RELEASE_API, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    tag_name?: string;
    body?: string;
    html_url?: string;
    assets?: GhAsset[];
  };
  const tag = (json.tag_name ?? '').trim();
  if (!tag) return null;

  const assets = json.assets ?? [];
  const apk = assets.find((a) => a.name.toLowerCase().endsWith('.apk')) ?? null;
  const checksums = assets.find((a) => /checksums?\.txt$/i.test(a.name) || /\.sha256$/i.test(a.name)) ?? null;
  const certAsset = assets.find((a) => /cert-fingerprint\.txt$/i.test(a.name)) ?? null;

  // Signature-continuity gate: never offer an update signed by a different key.
  const ownCert = normalizeCertSha256(
    (Constants.expoConfig?.extra as { certSha256?: string | null } | undefined)?.certSha256,
  );
  if (ownCert) {
    if (!certAsset) return null; // cannot verify signature continuity - fail closed
    try {
      const certRes = await fetch(certAsset.browser_download_url);
      const certText = certRes.ok ? await certRes.text() : '';
      const m = certText.match(/SHA256:\s*([0-9A-Fa-f:]+)/);
      const releaseCert = normalizeCertSha256(m?.[1] ?? null);
      if (!releaseCert || releaseCert !== ownCert) return null;
    } catch {
      return null;
    }
  }

  let expectedSha256: string | null = null;
  if (apk && checksums) {
    try {
      const csRes = await fetch(checksums.browser_download_url);
      if (csRes.ok) {
        const text = await csRes.text();
        // Lines look like: "<sha256>  velora-v1.2.0.apk"
        const line = text
          .split('\n')
          .map((l) => l.trim())
          .find((l) => l.toLowerCase().includes(apk.name.toLowerCase()));
        const m = line?.match(/^([a-f0-9]{64})\b/i);
        if (m) expectedSha256 = m[1].toLowerCase();
      }
    } catch {
      expectedSha256 = null;
    }
  }

  return {
    currentVersion,
    latestVersion: tag.replace(/^v/i, ''),
    isNewer: compareVersions(tag, currentVersion) > 0,
    notes: (json.body ?? '').trim(),
    apkUrl: apk?.browser_download_url ?? null,
    apkName: apk?.name ?? null,
    apkSize: apk?.size ?? null,
    expectedSha256,
    releaseUrl: json.html_url ?? `https://github.com/${REPO}/releases`,
  };
}

export interface DownloadResult {
  ok: boolean;
  error?: string;
}

/**
 * Downloads the APK, verifies its SHA-256 against the published checksum, then
 * hands off to the Android installer (which asks the user for confirmation and
 * enforces signature continuity). Fails closed: no checksum match, no install.
 */
export async function downloadAndInstall(
  info: UpdateInfo,
  onProgress?: (fraction: number) => void,
): Promise<DownloadResult> {
  if (Platform.OS !== 'android') return { ok: false, error: 'Updates are only available on Android.' };
  if (!info.apkUrl || !info.apkName) return { ok: false, error: 'This release has no APK asset.' };
  if (!info.expectedSha256) {
    return { ok: false, error: 'Cannot verify this update: release is missing its checksum file.' };
  }

  const target = `${FileSystem.cacheDirectory}${info.apkName}`;
  try {
    const download = FileSystem.createDownloadResumable(info.apkUrl, target, {}, (p) => {
      if (onProgress && p.totalBytesExpectedToWrite > 0) {
        onProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
      }
    });
    const result = await download.downloadAsync();
    if (!result?.uri) return { ok: false, error: 'Download failed. Check your connection and retry.' };

    const base64 = await FileSystem.readAsStringAsync(result.uri, { encoding: 'base64' });
    const actual = (
      await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, base64, {
        encoding: Crypto.CryptoEncoding.BASE64,
      })
    ).toLowerCase();
    if (actual !== info.expectedSha256) {
      await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => undefined);
      return { ok: false, error: 'Checksum mismatch - the downloaded update failed verification and was deleted.' };
    }

    const contentUri = await FileSystem.getContentUriAsync(result.uri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      flags: 0x00000001 | 0x10000000, // FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK
      type: APK_MIME,
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Update failed' };
  }
}
