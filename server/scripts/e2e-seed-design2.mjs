// Synthetic LOCAL backend only: v1.5.7 proofs (series sort, scrollable Watched tab). Real TMDB ids + posters.
import { readFileSync } from 'node:fs';
const { aliceToken, bobToken } = JSON.parse(readFileSync('/tmp/e2e-tokens.json', 'utf8'));
const H = { Authorization: `Bearer ${aliceToken}`, 'Content-Type': 'application/json' };
const HB = { Authorization: `Bearer ${bobToken}`, 'Content-Type': 'application/json' };
const call = async (method, path, body) => {
  const r = await fetch(`http://127.0.0.1:8787/api${path}`, { method, headers: H, body: JSON.stringify(body) });
  if (!r.ok) throw Error(`${method} ${path}: ${r.status} ${await r.text()}`);
};
const lib = (mediaType, tmdbId, title, posterPath, status, extra = {}) => call('PUT', `/library/${mediaType}/${tmdbId}`, { mediaType, tmdbId, title, posterPath, status, ...extra });
const tmdb = async (path) => {
  const r = await fetch(`https://proxy-api-server-f1an.onrender.com/v1/tmdb/3${path}`);
  if (!r.ok) throw Error(`tmdb ${path}: ${r.status}`);
  return r.json();
};
// Want tab (the landing tab): 12 real trending movies so the tab scrolls for the pinned-tabs proof.
const trending = await tmdb('/trending/movie/day');
for (const m of trending.results.slice(0, 12)) {
  await lib('movie', m.id, m.title, m.poster_path, 'want');
  await new Promise((r) => setTimeout(r, 120));
}
// Series tab: active series first, ended+fully-watched LAST (most recent added_at, so they
// would lead the default recent sort without the sink rule). TMDB status decides the sink.
// COHERENT FIXTURE (25 Nov, after the 62/62-vs-0/7 finding): episodes are marked through
// the REAL season API, so per-episode rows and the aggregate can never disagree; the
// backend's syncEpisodeCount derives the aggregate from actual rows. Completed series mark
// every AIRED episode and take the aired count as their total; partial series mark the
// first N episodes in season order against the full TMDB total.
const today = new Date().toISOString().slice(0, 10);
const seasonWatched = (id, sn, episodes, title, posterPath, totalEpisodes) =>
  call('PUT', `/library/tv/${id}/seasons/${sn}`, { episodes, title, posterPath, totalEpisodes });
const series = [
  [2288, 'Prison Break', 'watching', 88, 40],          // Ended but partial: stays up
  [71446, 'Money Heist', 'watching', 41, 31],          // Ended but partial: stays up
  [94997, 'House of the Dragon', 'watching', null, 'all'], // Returning, caught up: must NOT sink
  [1396, 'Breaking Bad', 'watched', null, 'all'],      // Ended + complete: sinks
  [70523, 'Dark', 'watched', null, 'all'],             // Ended + complete: sinks
];
for (const [id, title, status, totalWanted, watchedWanted] of series) {
  const d = await tmdb(`/tv/${id}`);
  const seasonNums = (d.seasons || []).filter((s) => s.season_number >= 1 && s.episode_count > 0).map((s) => s.season_number);
  const bySeason = [];
  let airedTotal = 0;
  for (const sn of seasonNums) {
    const s = await tmdb(`/tv/${id}/season/${sn}`);
    const eps = (s.episodes || []).filter((e) => e.air_date && e.air_date <= today).map((e) => e.episode_number);
    bySeason.push([sn, eps]);
    airedTotal += eps.length;
    await new Promise((r) => setTimeout(r, 120));
  }
  const total = totalWanted ?? airedTotal;
  await lib('tv', id, title, d.poster_path, status, { totalEpisodes: total });
  let remaining = watchedWanted === 'all' ? airedTotal : Math.min(watchedWanted, airedTotal);
  for (const [sn, eps] of bySeason) {
    if (remaining <= 0) break;
    const take = eps.slice(0, remaining);
    if (take.length) {
      await seasonWatched(id, sn, take, title, d.poster_path, total);
      remaining -= take.length;
      await new Promise((r) => setTimeout(r, 120));
    }
  }
}
// F1 LAST so it is the most recent Want item (top-left on the landing tab): director-first cast proof.
const f1 = await tmdb('/movie/911430');
await lib('movie', 911430, 'F1', f1.poster_path, 'want');
// Populated Activity feed proof: bob owns one real movie and alice follows him,
// so her feed has a real event and the explainer footer renders (empty feed
// renders the empty state instead - captured separately as evidence).
const f1b = await tmdb('/movie/911430');
{
  const r = await fetch('http://127.0.0.1:8787/api/library/movie/911430', { method: 'PUT', headers: HB, body: JSON.stringify({ mediaType: 'movie', tmdbId: 911430, title: 'F1', posterPath: f1b.poster_path, status: 'watched' }) });
  if (!r.ok) throw Error(`bob library: ${r.status} ${await r.text()}`);
}
{
  const r = await fetch('http://127.0.0.1:8787/api/social/follow/e2e_bob', { method: 'POST', headers: H, body: '{}' });
  if (!r.ok) throw Error(`follow: ${r.status} ${await r.text()}`);
}
console.log('seeded 1510');
