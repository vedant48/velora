// Synthetic LOCAL backend only: v1.5.7 proofs (series sort, scrollable Watched tab). Real TMDB ids + posters.
import { readFileSync } from 'node:fs';
const { aliceToken } = JSON.parse(readFileSync('/tmp/e2e-tokens.json', 'utf8'));
const H = { Authorization: `Bearer ${aliceToken}`, 'Content-Type': 'application/json' };
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
// Watched tab: 12 real trending movies so the tab scrolls for the pinned-tabs proof.
const trending = await tmdb('/trending/movie/day');
for (const m of trending.results.slice(0, 12)) {
  await lib('movie', m.id, m.title, m.poster_path, 'watched');
  await new Promise((r) => setTimeout(r, 120));
}
// Series tab: active series first, ended+fully-watched LAST (most recent added_at, so they
// would lead the default recent sort without the sink rule). TMDB status decides the sink.
const series = [
  [2288, 'Prison Break', 'watching', 88, 40],      // Ended but partial: stays up
  [71446, 'Money Heist', 'watching', 41, 31],      // Ended but partial: stays up
  [94997, 'House of the Dragon', 'watching', 26, 26], // Returning Series, caught up: must NOT sink
  [1396, 'Breaking Bad', 'watched', 62, 62],       // Ended + complete: sinks
  [70523, 'Dark', 'watched', 26, 26],              // Ended + complete: sinks
];
for (const [id, title, status, total, watched] of series) {
  const d = await tmdb(`/tv/${id}`);
  await lib('tv', id, title, d.poster_path, status, { totalEpisodes: total, episodesWatched: watched });
}
console.log('seeded 157');
