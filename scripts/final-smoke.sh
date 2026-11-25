#!/usr/bin/env bash
set -uo pipefail
mkdir -p proof; export PATH="$PATH:$HOME/.maestro/bin"
adb shell wm size 720x1600; adb shell wm density 320
python3 scripts/emulator-ready.py || true
for n in 1; do
curl -sSL -o proof/v1.5.16.apk https://github.com/vedant48/velora/releases/download/v1.5.16/velora-v1.5.16.apk
curl -sSL -o proof/v1.5.17.apk https://github.com/vedant48/velora/releases/download/v1.5.17/velora-v1.5.17.apk
done
sha256sum proof/v1.5.1[67].apk | tee proof/sha.txt
adb install proof/v1.5.16.apk 2>&1 | tee proof/install-1516.txt
adb shell dumpsys package com.vedant.velora | grep -E "versionCode|versionName" | tee proof/dump-before.txt
adb shell monkey -p com.vedant.velora -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1; sleep 12
adb exec-out screencap -p > proof/before-upgrade-1516.png
adb install -r proof/v1.5.17.apk 2>&1 | tee proof/install-over-1517.txt
adb shell dumpsys package com.vedant.velora | grep -E "versionCode|versionName|lastUpdateTime|firstInstallTime" | tee proof/dump-after.txt
adb shell am force-stop com.vedant.velora
maestro test --format junit --output proof/smoke.xml --test-output-dir proof/smoke .maestro/final-smoke.yaml > proof/maestro-out.txt 2>&1 || echo "maestro nonzero" >> proof/maestro-out.txt
adb logcat -d -t 600 > proof/logcat.txt || true
adb logcat -d | grep -iE "FATAL EXCEPTION|ReactNativeJS.*Error" | head -10 > proof/crashes.txt || true
rm -f proof/*.apk
exit 0
