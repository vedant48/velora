#!/usr/bin/env bash
set -euo pipefail
mkdir -p must-evidence
adb reverse tcp:8787 tcp:8787
adb install candidate/must-test.apk
adb shell wm size 720x1280
adb shell wm density 320
python3 scripts/emulator-ready.py
adb push .ci/must-synth.json /sdcard/Download/must-synth.json
adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Download/must-synth.json || true
adb shell screenrecord --time-limit 170 /sdcard/must.mp4 > must-evidence/record.log 2>&1 &
rec=$!
set +e
maestro test --format junit --output must-evidence/must-import.xml --test-output-dir must-evidence/maestro .maestro/must-import.yaml
status=$?
adb shell pkill -INT screenrecord || true
wait "$rec" || true
adb pull /sdcard/must.mp4 must-evidence/must.mp4 || true
adb logcat -d -t 800 > must-evidence/logcat.txt
if [ "$status" = 0 ]; then node server/scripts/../../scripts/e2e-must-verify.mjs > must-evidence/verify.txt 2>&1; status=$?; fi
cat must-evidence/verify.txt || true
exit $status
