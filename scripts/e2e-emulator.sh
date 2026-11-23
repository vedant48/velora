#!/usr/bin/env bash
# Runs on the emulator: install the e2e APK, drive flow A (login, photo
# visible, remove via UI, fallback, set saved dark theme), re-seed the photo,
# run flow B (second member view + sign-out/sign-in), then the saved-theme vs
# device-theme mismatch cold start. Evidence lands in photo-evidence/.
set -uo pipefail
mkdir -p photo-evidence
pip install --quiet pillow
adb reverse tcp:8787 tcp:8787
adb install candidate/app-release.apk
adb shell wm size 720x1280
adb shell wm density 320
python3 scripts/native-splash-frames.py
adb shell cmd uimode night no
status=0
maestro test --format junit --output photo-evidence/flow-a.xml --test-output-dir photo-evidence/maestro-a .maestro/flow-a-alice.yaml || status=1
(cd server && node scripts/e2e-reseed-avatar.mjs) || status=1
maestro test --format junit --output photo-evidence/flow-b.xml --test-output-dir photo-evidence/maestro-b .maestro/flow-b-bob.yaml || status=1
python3 scripts/native-theme-mismatch.py || status=1
adb logcat -d -t 1500 > photo-evidence/logcat.txt || true
exit $status
