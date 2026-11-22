#!/usr/bin/env node
/** Re-seeds alice's avatar mid-flow (after the UI remove test) using the
 *  token saved by e2e-seed.mjs, so the member-view/relogin checks have a
 *  photo to render. Also proves replace works after a remove. */
import { readFileSync } from 'node:fs';
import { seedAvatar } from './e2e-seed.mjs';
const { aliceToken } = JSON.parse(readFileSync('/tmp/e2e-tokens.json', 'utf8'));
const up = await seedAvatar(aliceToken);
console.log(JSON.stringify({ reseeded: true, avatarAt: up.avatarAt }));
