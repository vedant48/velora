#!/usr/bin/env bash
set -euo pipefail
mkdir -p permission-evidence
adb reverse tcp:8787 tcp:8787
adb install candidate/permission-test.apk
adb shell wm size 720x1280
adb shell wm density 320
python3 scripts/emulator-ready.py
adb shell cmd uimode night yes
set +e
maestro test --test-output-dir permission-evidence .maestro/permissions-photo.yaml
status=$?
adb shell dumpsys package com.vedant.velora > permission-evidence/package.txt
adb logcat -d -t 1000 > permission-evidence/logcat.txt
curl -sf http://127.0.0.1:8787/api/health > permission-evidence/backend-health.json
if [ "$status" = 0 ]; then
  adb shell pm clear com.vedant.velora
  adb uninstall com.vedant.velora
  adb install production/old.apk
  adb shell monkey -p com.vedant.velora 1
  sleep 8
  adb install -r production/velora-v1.4.6.apk > permission-evidence/upgrade-install.txt
  adb shell monkey -p com.vedant.velora 1
  sleep 10
  adb exec-out screencap -p > permission-evidence/production146-start.png
  adb shell dumpsys package com.vedant.velora > permission-evidence/production146-package.txt
  adb shell am start -a android.settings.MANAGE_UNKNOWN_APP_SOURCES -d package:com.vedant.velora
  sleep 3
  adb exec-out screencap -p > permission-evidence/installer-permission.png
fi
exit "$status"
