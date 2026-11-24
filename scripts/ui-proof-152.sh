#!/usr/bin/env bash
set -uo pipefail
mkdir -p proof
{ bash scripts/e2e-backend.sh && (cd server && node scripts/e2e-seed-152.mjs && sleep 2 && node scripts/e2e-ui-library.mjs); } > proof/backend-setup.log 2>&1 || { echo SETUP_FAILED >> proof/backend-setup.log; tail -40 /tmp/wrangler-dev.log > proof/wrangler-tail.log 2>&1; exit 1; }
cp /tmp/wrangler-dev.log proof/wrangler-dev.log 2>/dev/null || true
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
