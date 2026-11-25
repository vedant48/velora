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
# Log-in and land on the Library first (no recording yet)
maestro test --format junit --output proof/ui-login.xml --test-output-dir proof/maestro-login .maestro/flicker-login-1511.yaml || status=1
# Record the actual fling motion
adb shell screenrecord --time-limit 120 --size 720x1480 /sdcard/flicker.mp4 > proof/record.log 2>&1 &
record_pid=$!
sleep 2
maestro test --format junit --output proof/ui-flicker.xml --test-output-dir proof/maestro-flicker .maestro/flicker-1511.yaml || status=1
adb shell pkill -INT screenrecord || true
wait "$record_pid" || true
adb pull /sdcard/flicker.mp4 proof/flicker.mp4 || true
adb shell pm clear com.vedant.velora
maestro test --format junit --output proof/ui-cards.xml --test-output-dir proof/maestro-cards .maestro/cards-1510.yaml || status=1
adb logcat -d -t 1000 > proof/logcat.txt || true
exit $status
