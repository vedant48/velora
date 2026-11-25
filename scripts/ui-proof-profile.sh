#!/usr/bin/env bash
set -uo pipefail
mkdir -p proof
{ bash scripts/e2e-backend.sh && (cd server && node scripts/e2e-seed-design2.mjs && node scripts/e2e-seed-circle.mjs); } > proof/backend-setup.log 2>&1 || { echo SETUP_FAILED >> proof/backend-setup.log; exit 1; }
adb reverse tcp:8787 tcp:8787
adb install candidate/app-release.apk
adb shell wm size 720x1600
adb shell wm density 320
python3 scripts/emulator-ready.py || true
export PATH="$PATH:$HOME/.maestro/bin"
sed -i 's/? *15000/? 5000/' scripts/e2e-delay-proxy-skeleton.cjs
nohup node scripts/e2e-delay-proxy-skeleton.cjs > proof/delay.log 2>&1 &
sleep 1
shots() { # $1 = prefix: relaunch app then screencap every ~1s for 14s
  adb shell am force-stop com.vedant.velora
  adb shell monkey -p com.vedant.velora -c android.intent.category.LAUNCHER 1 > /dev/null 2>&1
  for i in $(seq 1 14); do adb exec-out screencap -p > "proof/$1-$(printf %02d $i).png"; sleep 1; done
  sleep 12
  adb exec-out screencap -p > "proof/$1-final.png"
}
for mode in dark light; do
  adb reverse tcp:8787 tcp:8787
  [ "$mode" = dark ] && adb shell cmd uimode night yes || adb shell cmd uimode night no
  maestro test -e P=$mode .maestro/login-design2.yaml > proof/login-$mode.log 2>&1 || true
  adb reverse tcp:8787 tcp:8788
  shots prof-$mode
done
adb logcat -d -t 400 > proof/logcat.txt || true
exit 0
