// Synthetic LOCAL backend only: card cases (rating / review / progress / ended tick). Real TMDB ids + posters.
import { readFileSync } from 'node:fs';
const { aliceToken } = JSON.parse(readFileSync('/tmp/e2e-tokens.json', 'utf8'));
const H = { Authorization: `Bearer ${aliceToken}`, 'Content-Type': 'application/json' };
const call = async (method, path, body) => {
  const r = await fetch(`http://127.0.0.1:8787/api${path}`, { method, headers: H, body: JSON.stringify(body) });
  if (!r.ok) throw Error(`${method} ${path}: ${r.status} ${await r.text()}`);
};
const lib = (mediaType, tmdbId, title, posterPath, status, extra = {}) => call('PUT', `/library/${mediaType}/${tmdbId}`, { mediaType, tmdbId, title, posterPath, status, ...extra });
const rev = (mediaType, tmdbId, seasonNumber, rating, body = '') => call('PUT', `/reviews/${mediaType}/${tmdbId}`, { seasonNumber, rating, body });
// Movies (Watched tab)
await lib('movie', 911430, 'F1', '/9PXZIUsSDh4alB80jheWX4fhZmy.jpg', 'watched', { rating: 9 }); await rev('movie', 911430, 0, 9, 'Loved the racing.');
await lib('movie', 313369, 'La La Land', '/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg', 'watched', { rating: 8 }); // rating, no review
await lib('movie', 1100988, '28 Years Later', '/n5FygjEppOvac6yEaowi26nTyw3.jpg', 'watched'); // no rating: nothing on the right
// Series (Series tab)
await lib('tv', 1396, 'Breaking Bad', '/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg', 'watched', { totalEpisodes: 62, episodesWatched: 62 }); await rev('tv', 1396, 5, 10); // single rating + ended complete -> tick
await lib('tv', 71446, 'Money Heist', '/reEMJA1uzscCbkpeRJeTT2bjqUp.jpg', 'watching', { totalEpisodes: 41, episodesWatched: 31 }); await rev('tv', 71446, 1, 10); await rev('tv', 71446, 2, 9, 'Great season.'); // multiple + review, ended partial -> 10 left
await lib('tv', 94997, 'House of the Dragon', '/7V0Ebks0GgpKvQ7QbLAIdX5dos4.jpg', 'watching', { totalEpisodes: 18, episodesWatched: 18 }); await rev('tv', 94997, 1, 9); await rev('tv', 94997, 2, 8); // ongoing caught up: no tick
await lib('tv', 2288, 'Prison Break', '/wnmNPaLvhnMeOqnWlhNkYCZxtda.jpg', 'watching', { totalEpisodes: 90, episodesWatched: 40 }); // no rating, partial
await lib('tv', 99966, 'All of Us Are Dead', '/pTEFqAjLd5YTsMD6NSUxV6Dq7A6.jpg', 'watching', { totalEpisodes: 0 }); await rev('tv', 99966, 1, 7); // unknown total: rating only, no tracker
console.log('seeded cards');
