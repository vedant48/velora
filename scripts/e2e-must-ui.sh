#!/usr/bin/env bash
set -euo pipefail
mkdir -p photo-evidence
adb reverse tcp:8787 tcp:8787
adb install candidate/app-release.apk
adb shell wm size 720x1280
adb shell wm density 320
python3 scripts/emulator-ready.py
adb shell cmd uimode night yes
maestro test --format junit --output photo-evidence/must-ui.xml --test-output-dir photo-evidence/maestro .maestro/must-ui.yaml
adb logcat -d -t 1000 > photo-evidence/logcat.txt
