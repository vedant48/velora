#!/usr/bin/env bash
set -uo pipefail
mkdir -p proof
{ bash scripts/e2e-backend.sh && (cd server && node scripts/e2e-seed-design2.mjs && node scripts/e2e-seed-circle.mjs); } > proof/backend-setup.log 2>&1 || { echo SETUP_FAILED >> proof/backend-setup.log; tail -40 /tmp/wrangler-dev.log > proof/wrangler-tail.log 2>&1; exit 1; }
adb reverse tcp:8787 tcp:8787
adb install candidate/app-release.apk
adb shell wm size 720x1600
adb shell wm density 320
python3 scripts/emulator-ready.py || true
export PATH="$PATH:$HOME/.maestro/bin"
status=0
run() { maestro test --format junit --output "proof/$1.xml" --test-output-dir "proof/$1" -e P="$2" ".maestro/$3.yaml" || status=1; }
adb shell cmd uimode night yes
run dark-circle dark circle-1517
nohup node scripts/e2e-delay-proxy-skeleton.cjs > proof/delay.log 2>&1 &
sleep 1
adb reverse tcp:8787 tcp:8788
run dark-skeleton dark skeleton-1517
adb reverse tcp:8787 tcp:8787
adb shell cmd uimode night no
run light-circle light circle-1517
adb reverse tcp:8787 tcp:8788
run light-skeleton light skeleton-1517
adb exec-out screencap -p > proof/final-screen.png || true
adb logcat -d -t 800 > proof/logcat.txt || true
exit $status
