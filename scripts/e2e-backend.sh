#!/usr/bin/env bash
# Starts the real Velora API locally (wrangler dev + local D1) for the
# emulator e2e run, applies every migration, seeds two synthetic users and a
# synthetic avatar via the real API, and verifies member/anon visibility.
set -euo pipefail
cd "$(dirname "$0")/../server"
npm ci --no-audit --no-fund
printf 'JWT_SECRET=e2e-local-secret-not-production\n' > .dev.vars
npx wrangler d1 migrations apply velora-db --local
nohup npx wrangler dev --local --port 8787 --ip 127.0.0.1 > /tmp/wrangler-dev.log 2>&1 &
for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:8787/api/health >/dev/null 2>&1; then break; fi
  sleep 2
done
curl -sf http://127.0.0.1:8787/api/health >/dev/null
node scripts/e2e-seed.mjs
