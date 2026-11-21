#!/usr/bin/env python3
"""CI helper: inject the upload-key release signingConfig into the Expo-generated
android/app/build.gradle. The template only defines a debug signingConfig and
uses it for the release buildType; we add a release config that reads the
upload credentials from environment variables, and point release at it.
Never commit real credentials: values come from GitHub Actions secrets."""
import re, sys

path = 'android/app/build.gradle'
s = open(path).read()

if 'veloraRelease' in s:
    print('already patched')
    sys.exit(0)

block = """
        veloraRelease {
            storeFile file(System.getenv('VELORA_UPLOAD_KEYSTORE_PATH') ?: 'missing-upload.keystore')
            storePassword System.getenv('VELORA_UPLOAD_STORE_PASSWORD')
            keyAlias System.getenv('VELORA_UPLOAD_KEY_ALIAS')
            keyPassword System.getenv('VELORA_UPLOAD_STORE_PASSWORD')  // PKCS12: key entry uses the store password
        }
"""
# Insert the release signingConfig right after the debug block's closing brace inside signingConfigs
m = re.search(r"(signingConfigs \{\n(?:.|\n)*?\n    \})\n    buildTypes", s)
assert m, 'signingConfigs block not found'
s = s[:m.end(1) - 6] + block + '    }' + s[m.end(1):]

# Point ONLY the release buildType at the new config (debug keeps the debug key)
s = s.replace(
    """        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug""",
    """        release {
            // Signed with the Velora upload key (credentials injected by CI; see scripts/apply-release-signing.py).
            signingConfig signingConfigs.veloraRelease""",
)
assert 'signingConfigs.veloraRelease' in s, 'release buildType patch failed'
open(path, 'w').write(s)
print('patched release signing config')
