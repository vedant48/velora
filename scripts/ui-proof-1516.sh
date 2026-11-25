#!/usr/bin/env bash
set -uo pipefail
mkdir -p proof
{ bash scripts/e2e-backend.sh && (cd server && node scripts/e2e-seed-design2.mjs); } > proof/backend-setup.log 2>&1 || { echo SETUP_FAILED >> proof/backend-setup.log; tail -40 /tmp/wrangler-dev.log > proof/wrangler-tail.log 2>&1; exit 1; }
adb reverse tcp:8787 tcp:8787
adb install candidate/app-release.apk
adb shell wm size 720x1600
adb shell wm density 320
python3 scripts/emulator-ready.py || true
adb shell cmd uimode night yes
export PATH="$PATH:$HOME/.maestro/bin"
adb shell screenrecord --time-limit 180 --bit-rate 6000000 /sdcard/h.mp4 > proof/record.log 2>&1 &
rec=$!
status=0
maestro test --format junit --output proof/ui.xml --test-output-dir proof/maestroH .maestro/settings-1516.yaml || status=1
adb shell pkill -INT screenrecord || true
wait "$rec" || true
sleep 2
adb pull /sdcard/h.mp4 proof/h.mp4 || true
adb exec-out screencap -p > proof/final-screen.png || true
adb logcat -d -t 800 > proof/logcat.txt || true
exit $status
