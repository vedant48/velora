# Velora API (server/)

NestJS backend for Velora, built to run on **Cloudflare Workers** with **Cloudflare D1** (SQLite) — designed to stay within the **$0 free tier**.

## Stack and why

- **NestJS 11** (ExpressAdapter) running on Workers via `node:http` server support
  (`handleAsNodeRequest` from `cloudflare:node`, `nodejs_compat`).
  Pattern: Cloudflare blog "Bringing Node.js HTTP servers to Cloudflare Workers" (Sep 8, 2025)
  and nestjs/nest discussion #18261. The Nest app is bootstrapped once per isolate and cached.
- **D1 (SQLite)** for all persistence. Migrations in `migrations/`.
- **WebCrypto PBKDF2** for password hashing and **WebCrypto HMAC-SHA256 JWT** for sessions:
  no native deps, Workers-safe.
- **Google sign-in**: the app sends a Google ID token; the API verifies it against
  `https://oauth2.googleapis.com/tokeninfo` and checks the audience against
  `GOOGLE_CLIENT_IDS`. Phone OTP (Must-style) was deliberately not implemented:
  SMS OTP has no sustainable free tier (Firebase Phone Auth is Blaze-only and
  billed per SMS; Twilio Verify is $0.05/verification).

## Free-tier envelope (verified 2026-11-21)

| Resource | Free limit | Source |
|---|---|---|
| Workers requests | 100,000/day | https://developers.cloudflare.com/workers/platform/pricing/ |
| Workers CPU | 10 ms per invocation | same |
| D1 rows read | 5,000,000/day | https://developers.cloudflare.com/d1/platform/pricing/ |
| D1 rows written | 100,000/day | same |
| D1 storage | 5 GB total | same |
| Static assets | free/unlimited | workers pricing page |

Local measurement (workerd, `wrangler dev`, NOT production billed-CPU proof):
first request incl. NestJS bootstrap ~40ms wall-clock, warm requests ~4ms wall-clock.
Wall-clock is not CPU-time; verify against the Cloudflare dashboard after first deploy.
NestJS is a heavy framework for Workers; if cold isolates ever exceed the free CPU
budget, the API returns errors on those cold requests only — mitigation is the
$5/mo Workers Paid plan (NOT enabled by default) or slimming the hot path.

## Setup (all free)

```bash
cd server
npm install
npx wrangler login                      # browser OAuth, free Cloudflare account
npx wrangler d1 create velora-db        # prints database_id -> paste into wrangler.toml
npx wrangler d1 migrations apply velora-db --remote
npx wrangler secret put JWT_SECRET      # any long random string
npx wrangler secret put GOOGLE_CLIENT_IDS   # comma-separated OAuth client IDs (optional)
# optional SIMKL sync (free SIMKL API app registration at https://simkl.com/settings/developer/):
npx wrangler secret put SIMKL_CLIENT_ID
npx wrangler secret put SIMKL_CLIENT_SECRET
npm run deploy                          # -> https://velora-api.<subdomain>.workers.dev
```

Local dev: `cp .dev.vars.example .dev.vars`, `npm run db:migrate:local`, `npm run dev`.

## Tests

`npm run dev` in one shell, then `node scripts/smoke.mjs` — 24 end-to-end checks:
auth validation + JWT, library CRUD, episode progress bounds, reviews, follow /
match% / activity feed, public profiles + rank, Velora/SIMKL export + import round-trips.

## API surface

- `POST /api/auth/signup|login|google`, `GET /api/auth/me`
- `GET /api/users/search?q=`, `GET /api/users/:username` (stats + rank), `PATCH /api/users/me`, `GET /api/users/:username/library?status=`
- `GET/PUT/PATCH/DELETE /api/library/...`, `POST /api/library/lookup`, `GET /api/library/export?format=velora|simkl`, `POST /api/library/import`
- `GET/PUT/DELETE /api/reviews/:mediaType/:tmdbId` (seasonNumber 0 = whole title; >=1 = that season)
- `POST/DELETE /api/social/follow/:username`, `GET /api/social/match/:username`, `GET /api/social/activity`
- `GET /api/simkl/status`, `POST /api/simkl/connect|import|export`, `DELETE /api/simkl/disconnect`

## SIMKL notes

- SIMKL CSV/ZIP backups are SIMKL **Pro** features; the SIMKL **API is free** for all members.
  Free end-to-end path: the built-in SIMKL connector (above) once he registers a free SIMKL app.
  File import/export is an additional path for anyone who already has a SIMKL backup file.
- Status mapping: `plantowatch -> want`, `watching -> watching`, `completed -> watched`.
  SIMKL `hold`/`dropped` map to `watching`/`watched` (no native equivalent).
  Episode progress maps from `watched_episodes_count`; per-episode history is not imported.

## Capacity sketch (2,000-3,000 users)

~3,000 users x ~30 API calls/day ≈ 90k requests/day — inside the 100k/day free budget with
little headroom; D1 read/write budgets are far above this usage shape. The bottleneck to
watch is the Workers daily request quota, and images/TMDB stay on the existing proxy +
TMDB free keys (their own limits). Not load-tested against production; treat as modeling,
not a guarantee.
