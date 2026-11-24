#!/usr/bin/env bash
set -x
mkdir -p proof
adb install -r candidate/velora-v1.5.6.apk
adb shell dumpsys package com.vedant.velora | grep -E "versionName|versionCode" | tee proof/package.txt
adb shell monkey -p com.vedant.velora -c android.intent.category.LAUNCHER 1
sleep 12
adb exec-out screencap -p > proof/launch.png
adb logcat -d -t 400 > proof/logcat.txt
ls -la proof
