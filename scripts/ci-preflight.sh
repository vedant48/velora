#!/usr/bin/env bash
# ci-preflight.sh <runner-script>... - resolve every CI-referenced seed/script/flow
# path against the checked-out tree BEFORE any expensive build. Exits 1 on any miss.
set -uo pipefail
fail=0
check() {
  if [ -f "$1" ]; then echo "OK   $1"; return; fi
  # Runner scripts cd into server/ before node scripts/...; resolve that form too.
  case "$1" in scripts/*)
    if [ -f "server/$1" ]; then echo "OK   server/$1"; return; fi ;;
  esac
  echo "MISS $1"; fail=1
}
scan() { grep -oE '((server/)?scripts|\.maestro)/[A-Za-z0-9._/-]+\.(sh|py|mjs|yaml)' "$1" 2>/dev/null | sort -u; }
for root in "$@"; do
  check "$root"
  for f in $(scan "$root"); do
    check "$f"
    case "$f" in
      *.sh) for g in $(scan "$f"); do check "$g"; done ;;
      *.yaml) for sub in $(grep -oE 'file: [A-Za-z0-9._-]+\.yaml' "$f" | awk '{print $2}'); do check ".maestro/$sub"; done ;;
    esac
  done
done
if [ $fail -eq 0 ]; then echo "PREFLIGHT PASS"; else echo "PREFLIGHT FAIL"; exit 1; fi
