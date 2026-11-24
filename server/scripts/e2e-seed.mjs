#!/usr/bin/env node
/**
 * Seeds the LOCAL e2e backend (wrangler dev on 127.0.0.1:8787) with two
 * synthetic users and a synthetic avatar photo for the first, via the real
 * API surface. Idempotent per fresh local D1. Synthetic data only.
 * Writes tokens to /tmp/e2e-tokens.json for the mid-run reseed step.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const API = 'http://127.0.0.1:8787/api';
const ALICE = { username: 'e2e_alice', password: 'e2e-alice-pass-1', displayName: 'Demo library' };
const BOB = { username: 'e2e_bob', password: 'e2e-bob-pass-1', displayName: 'E2E Bob' };

async function signup({ username, password, displayName }) {
  const res = await fetch(`${API}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, displayName }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`signup ${username} failed: ${res.status} ${JSON.stringify(json)}`);
  return json.token;
}

export async function seedAvatar(token) {
  const bytes = readFileSync(new URL('../../scripts/e2e-avatar.jpg', import.meta.url));
  const res = await fetch(`${API}/users/me/avatar`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream', Authorization: `Bearer ${token}` },
    body: bytes,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`avatar upload failed: ${res.status} ${JSON.stringify(json)}`);
  return json;
}

async function verifyAvatarVisible(viewerToken, username) {
  const res = await fetch(`${API}/users/${username}/avatar`, {
    headers: { Authorization: `Bearer ${viewerToken}` },
  });
  if (!res.ok) throw new Error(`avatar GET as other member failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength < 1000) throw new Error(`avatar GET returned too few bytes: ${buf.byteLength}`);
  return res.headers.get('cache-control');
}

const isMain = process.argv[1] && process.argv[1].endsWith('e2e-seed.mjs');
if (isMain) {
  const aliceToken = await signup(ALICE);
  const bobToken = await signup(BOB);
  const up = await seedAvatar(aliceToken);
  const cc = await verifyAvatarVisible(bobToken, 'e2e_alice');
  // Anonymous (no token) must be rejected - member-only visibility.
  const anon = await fetch(`${API}/users/e2e_alice/avatar`);
  if (anon.status !== 401 && anon.status !== 403) {
    throw new Error(`anonymous avatar GET expected 401/403, got ${anon.status}`);
  }
  writeFileSync('/tmp/e2e-tokens.json', JSON.stringify({ aliceToken, bobToken }));
  console.log(JSON.stringify({ seeded: true, avatarAt: up.avatarAt, cacheControl: cc, anonStatus: anon.status }));
}
