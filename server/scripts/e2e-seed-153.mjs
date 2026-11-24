// Synthetic LOCAL backend only: the owner's real 1404-item library shape (Want saved first, oldest updated_at).
import { readFileSync } from 'node:fs';
const { aliceToken } = JSON.parse(readFileSync('/tmp/e2e-tokens.json', 'utf8'));
const groups = [['movie', 'want', 330], ['tv', 'want', 43], ['movie', 'watched', 899], ['tv', 'watched', 52], ['tv', 'watching', 80]];
let id = 100000, ok = 0;
for (const [mediaType, status, n] of groups) {
  for (let i = 0; i < n; i++) {
    id++;
    const body = { mediaType, tmdbId: id, title: `${mediaType} ${status} ${i + 1}`, status, ...(mediaType === 'tv' ? { totalEpisodes: 10 } : {}) };
    const r = await fetch(`http://127.0.0.1:8787/api/library/${mediaType}/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${aliceToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw Error(`seed ${id}: ${r.status} ${await r.text()}`);
    ok++;
  }
  await new Promise((r) => setTimeout(r, 1100));
}
console.log('seeded', ok);
