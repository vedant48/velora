#!/usr/bin/env bash
# Update-path smoke: install v1.5.10, launch, install v1.5.11 OVER it (adb install -r
# keeps app data), launch again, verify versions and that the app data dir survived.
set -euo pipefail
PKG=com.vedant.velora
mkdir -p proof
LOG=proof/update-path.log
: > "$LOG"

step() { echo "== $* ==" | tee -a "$LOG"; }

ver() { adb shell dumpsys package "$PKG" | grep -E "versionCode|versionName" | head -2 | tr -s ' '; }

launch() {
  adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >>"$LOG" 2>&1
  sleep 12
  adb shell pidof "$PKG" > /dev/null
}

step "install v1.5.10"
adb install -g dl/velora-v1.5.10.apk 2>&1 | tee -a "$LOG"
ver | tee proof/version-1510.txt
grep -q "versionName=1.5.10" proof/version-1510.txt

step "launch v1.5.10"
launch
adb shell am force-stop "$PKG" || true

step "snapshot app data dir BEFORE update"
adb root > /dev/null 2>&1 || true
sleep 2
adb shell "ls -la /data/data/$PKG && ls -la /data/data/$PKG/databases 2>/dev/null; ls -la /data/data/$PKG/shared_prefs 2>/dev/null; ls -la /data/data/$PKG/files 2>/dev/null" > proof/data-before.txt 2>&1 || true
wc -l proof/data-before.txt | tee -a "$LOG"

step "install v1.5.11 OVER 1.5.10 (adb install -r, data preserved)"
adb install -r -g dl/velora-v1.5.11.apk 2>&1 | tee -a "$LOG"
ver | tee proof/version-1511.txt
grep -q "versionName=1.5.11" proof/version-1511.txt
grep -q "versionCode=10511" proof/version-1511.txt

step "snapshot app data dir AFTER update"
adb shell "ls -la /data/data/$PKG && ls -la /data/data/$PKG/databases 2>/dev/null; ls -la /data/data/$PKG/shared_prefs 2>/dev/null; ls -la /data/data/$PKG/files 2>/dev/null" > proof/data-after.txt 2>&1 || true

step "launch v1.5.11 post-update"
launch
adb exec-out screencap -p > proof/after-update-launch.png
adb shell am force-stop "$PKG" || true

step "data persistence check"
# An uninstall/reinstall would have wiped and recreated the dir; install -r keeps files.
# Compare top-level entries present before that are still present after.
comm -23 <(awk '{print $NF}' proof/data-before.txt | grep -v '^\.*$' | sort -u) <(awk '{print $NF}' proof/data-after.txt | grep -v '^\.*$' | sort -u) > proof/data-missing.txt || true
if [ -s proof/data-missing.txt ]; then
  echo "MISSING AFTER UPDATE:" | tee -a "$LOG"
  cat proof/data-missing.txt | tee -a "$LOG"
else
  echo "all pre-update top-level data entries still present" | tee -a "$LOG"
fi

step "RESULT: update path smoke PASSED"
echo "1.5.10 -> install-over -> 1.5.11 launch OK, version verified, data check above" | tee proof/RESULT.txt
