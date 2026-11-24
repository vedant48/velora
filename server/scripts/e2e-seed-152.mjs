// Synthetic LOCAL backend only: add a Want series (like the user's The Last Kingdom screenshot).
import { readFileSync } from 'node:fs';
const { aliceToken } = JSON.parse(readFileSync('/tmp/e2e-tokens.json', 'utf8'));
const row = { mediaType: 'tv', tmdbId: 63333, title: 'The Last Kingdom', posterPath: '/eOeTzwXKBEtoNDeijyqVQuhcALH.jpg', status: 'want', totalEpisodes: 46 };
const r = await fetch(`http://127.0.0.1:8787/api/library/tv/${row.tmdbId}`, { method: 'PUT', headers: { Authorization: `Bearer ${aliceToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(row) });
if (!r.ok) throw Error(`seed: ${r.status} ${await r.text()}`);
console.log('seeded Want series');
