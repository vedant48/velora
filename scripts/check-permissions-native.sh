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
exit "$status"
