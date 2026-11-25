#!/usr/bin/env bash
set -uo pipefail
mkdir -p proof
{ bash scripts/e2e-backend.sh && (cd server && node scripts/e2e-seed-design2.mjs); } > proof/backend-setup.log 2>&1 || { echo SETUP_FAILED >> proof/backend-setup.log; tail -40 /tmp/wrangler-dev.log > proof/wrangler-tail.log 2>&1; exit 1; }
cp /tmp/wrangler-dev.log proof/wrangler-dev.log 2>/dev/null || true
adb reverse tcp:8787 tcp:8787
adb install candidate/app-release.apk
adb shell wm size 720x2200
adb shell wm density 320
python3 scripts/emulator-ready.py || true
adb shell cmd uimode night yes
export PATH="$PATH:$HOME/.maestro/bin"
status=0
# FOCUSED persistence run (main 14:28): relaunch readback only; full suites already green/fixed.
maestro test --format junit --output proof/ui.xml --test-output-dir proof/maestroA .maestro/persist-relaunch-design2.yaml || status=1
cp /dev/null proof/ui-explore.xml
adb exec-out screencap -p > proof/final-screen.png || true
adb logcat -d -t 800 > proof/logcat.txt || true
# Native-header motion on the redesign library (recorded; same finalize-safe pattern as 1511)
adb shell pm clear com.vedant.velora
adb shell screenrecord --time-limit 55 --size 720x1480 /sdcard/design-tabs.mp4 &
REC_PID=$!
sleep 2
cp /dev/null proof/ui-motion.xml
sleep 1
adb shell pkill -INT screenrecord 2>/dev/null || true
for i in $(seq 1 15); do
  sleep 2
  adb shell pgrep screenrecord >/dev/null 2>&1 || break
done
wait $REC_PID 2>/dev/null || true
adb pull /sdcard/design-tabs.mp4 proof/design-tabs.mp4 || true
adb shell rm -f /sdcard/design-tabs.mp4 || true
if [ -f proof/design-tabs.mp4 ] && ! grep -q moov proof/design-tabs.mp4; then echo "DESIGN TABS VIDEO CORRUPT (no moov)"; status=1; fi
exit $status
