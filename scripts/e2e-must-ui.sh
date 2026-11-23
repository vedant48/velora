#!/usr/bin/env bash
set -euo pipefail
mkdir -p photo-evidence
adb reverse tcp:8787 tcp:8787
adb install candidate/app-release.apk
adb shell wm size 720x1280
adb shell wm density 320
python3 scripts/emulator-ready.py
adb shell cmd uimode night yes
adb shell screenrecord --time-limit 180 /sdcard/must-ui.mp4 > photo-evidence/record.log 2>&1 &
record_pid=$!
set +e
maestro test --format junit --output photo-evidence/must-ui.xml --test-output-dir photo-evidence/maestro .maestro/must-ui.yaml
status=$?
adb shell pkill -INT screenrecord || true
wait "$record_pid" || true
adb pull /sdcard/must-ui.mp4 photo-evidence/must-ui.mp4 || true
adb logcat -d -t 1000 > photo-evidence/logcat.txt

exit "$status"
