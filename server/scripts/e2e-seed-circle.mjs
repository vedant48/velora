// Synthetic LOCAL backend only: alice (photo) and bob (no photo) review F1 and Breaking Bad; alice follows bob.
import { readFileSync } from 'node:fs';
const { aliceToken, bobToken } = JSON.parse(readFileSync('/tmp/e2e-tokens.json', 'utf8'));
const put = async (token, path, body) => {
  const r = await fetch(`http://127.0.0.1:8787/api${path}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw Error(`${path}: ${r.status} ${await r.text()}`);
};
const rev = (t, mt, id, seasonNumber, rating, body) => put(t, `/reviews/${mt}/${id}`, { seasonNumber, rating, body });
// Series: alice S1 + S2 + S3, bob S1 + S2 + S4. Last rated season: alice S3 (9), bob S4 (7).
await rev(aliceToken, 'tv', 1396, 1, 10, 'Season one is the tightest pilot run I have seen, every episode earns the next.');
await rev(aliceToken, 'tv', 1396, 2, 8, 'Season two builds the plane crash slowly but it pays off.');
await rev(aliceToken, 'tv', 1396, 3, 9, 'Season three is where it turns dark. Hank and Walt finally collide.');
await rev(bobToken, 'tv', 1396, 1, 9, 'Great start, Bryan Cranston carries it.');
await rev(bobToken, 'tv', 1396, 2, 7, 'Slower than the first but Gus is a great villain.');
await rev(bobToken, 'tv', 1396, 4, 7, 'Season four, the cat and mouse never lets up.');
// Movie
await rev(aliceToken, 'movie', 911430, 0, 8, 'Loud, fast and the racing scenes look real.');
await rev(bobToken, 'movie', 911430, 0, 9, 'Best racing movie in years.');
console.log('seeded circle');
