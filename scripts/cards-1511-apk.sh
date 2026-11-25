#!/usr/bin/env bash
set -uo pipefail
mkdir -p proof
{ bash scripts/e2e-backend.sh && (cd server && node scripts/e2e-seed-1511.mjs); } > proof/backend-setup.log 2>&1 || { echo SETUP_FAILED >> proof/backend-setup.log; tail -40 /tmp/wrangler-dev.log > proof/wrangler-tail.log 2>&1; exit 1; }
adb reverse tcp:8787 tcp:8787
adb install candidate/app-release.apk
adb shell wm size 720x2200
adb shell wm density 320
python3 scripts/emulator-ready.py || true
adb shell cmd uimode night yes
export PATH="$PATH:$HOME/.maestro/bin"
status=0
# Deterministic logged-out state: cards-1510 begins with its own login
adb shell pm clear com.vedant.velora
maestro test --format junit --output proof/ui-cards.xml --test-output-dir proof/maestro-cards .maestro/cards-1510.yaml || status=1
adb exec-out screencap -p > proof/final-screen.png || true
adb logcat -d -t 1000 > proof/logcat.txt || true
# Tab-switch motion on the same saved fixed APK (recorded like the flicker runs)
adb shell pm clear com.vedant.velora
maestro test .maestro/login.yaml || status=1
adb shell screenrecord --time-limit 70 --size 720x1480 /sdcard/flicker-tabs.mp4 &
REC_PID=$!
sleep 2
maestro test --format junit --output proof/ui-tabs.xml --test-output-dir proof/maestro-tabs .maestro/flicker-tabs-1511.yaml || status=1
sleep 1
kill -INT $REC_PID 2>/dev/null || true
sleep 2
adb pull /sdcard/flicker-tabs.mp4 proof/flicker-tabs.mp4 || true
adb shell rm -f /sdcard/flicker-tabs.mp4 || true
exit $status
