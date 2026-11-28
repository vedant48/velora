#!/usr/bin/env bash
# E2E harness only - never used by the APK build.
# The emulator action runs each workflow script line as its own sh -c, so the
# flow run, logcat capture and exit-code propagation must live in one process.
set -uo pipefail
adb reverse tcp:8788 tcp:8788
adb install candidate/app-release.apk
mkdir -p evidence
"$HOME/.maestro/bin/maestro" test --test-output-dir evidence .maestro/preview-explore.yaml
MAESTRO_EXIT=$?
# Capture device logs either way: distinguishes app network errors (cleartext
# refusal, failed fetch) from backend or selector issues. Highlights are
# echoed so they are readable in the job log without artifact access.
adb logcat -d -t 4000 > evidence/logcat-tail.txt 2>/dev/null || true
echo '--- logcat highlights ---'
grep -iE 'cleartext|ReactNativeJS|AndroidRuntime|ECONN|ETIMEDOUT|UnknownHost' evidence/logcat-tail.txt | tail -30 || true
echo '--- end logcat highlights ---'
exit "$MAESTRO_EXIT"
