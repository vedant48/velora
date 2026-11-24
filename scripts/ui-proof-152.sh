#!/usr/bin/env bash
set -uo pipefail
mkdir -p proof
adb reverse tcp:8787 tcp:8787
adb install candidate/app-release.apk
adb shell wm size 720x1280
adb shell wm density 320
python3 scripts/emulator-ready.py || true
adb shell cmd uimode night yes
export PATH="$PATH:$HOME/.maestro/bin"
status=0
maestro test --format junit --output proof/ui.xml --test-output-dir proof/maestro .maestro/want-series-rating.yaml || status=1
adb exec-out screencap -p > proof/final-screen.png || true
adb logcat -d -t 800 > proof/logcat.txt || true
exit $status
