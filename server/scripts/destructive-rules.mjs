// Destructive-rule fixture verification against local wrangler dev.
// Uses a throwaway test user; never touches the real library.
const base = 'http://localhost:8787';
let failures = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -- ' + extra : ''}`);
  if (!cond) failures++;
};
const api = async (path, { method = 'GET', token, body } = {}) => {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
};

const un = `fix_${Date.now() % 1000000}`;
const su = await api('/auth/signup', { method: 'POST', body: { username: un, password: 'secret123' } });
const token = su.json?.token;
check('fixture signup', !!token);

const TV = 1399; // arbitrary fixture series id
// Setup: watching series, S1E1+E2 watched, S1 rating 9, S2 rating 8, series(0) rating 7
await api(`/library/tv/${TV}`, { method: 'PUT', token, body: { mediaType: 'tv', tmdbId: TV, title: 'Fixture Series', status: 'watching', totalEpisodes: 20 } });
await api(`/library/tv/${TV}/episodes`, { method: 'PUT', token, body: { season: 1, episode: 1, watched: true } });
await api(`/library/tv/${TV}/episodes`, { method: 'PUT', token, body: { season: 1, episode: 2, watched: true } });
await api(`/reviews/tv/${TV}`, { method: 'PUT', token, body: { rating: 9, seasonNumber: 1 } });
await api(`/reviews/tv/${TV}`, { method: 'PUT', token, body: { rating: 8, seasonNumber: 2 } });
await api(`/reviews/tv/${TV}`, { method: 'PUT', token, body: { rating: 7, seasonNumber: 0 } });

let prog = await api(`/library/tv/${TV}/episodes`, { token });
check('setup: 2 episode progress rows', (prog.json?.watched?.length ?? 0) === 2, JSON.stringify(prog.json));

// 1. Season unwatch (server): clears that season's episode progress only
await api(`/library/tv/${TV}/seasons/1`, { method: 'PUT', token, body: { watched: false } });
prog = await api(`/library/tv/${TV}/episodes`, { token });
check('season unwatch clears S1 episode progress', (prog.json?.watched?.length ?? -1) === 0);

// 1b. Client then deletes that season's review: verify deleteReview scopes correctly
await api(`/reviews/tv/${TV}?season=1`, { method: 'DELETE', token });
let mine = await api('/reviews/mine', { token });
const left = (mine.json?.reviews ?? []).filter((r) => r.tmdb_id === TV).map((r) => `${r.season_number}:${r.rating}`).sort();
check('after S1 unwatch+review delete: S2:8 and series:7 remain, S1:9 gone', left.join(',') === '0:7,2:8', left.join(','));

// 2. Re-setup, then Move to Want = fresh start
await api(`/library/tv/${TV}/episodes`, { method: 'PUT', token, body: { season: 2, episode: 5, watched: true } });
await api(`/library/tv/${TV}`, { method: 'PATCH', token, body: { rating: 6 } });
const mtw = await api(`/library/tv/${TV}/move-to-want`, { method: 'POST', token });
check('move-to-want returns item with status want', mtw.json?.status === 'want', JSON.stringify({ s: mtw.json?.status, r: mtw.json?.rating, e: mtw.json?.episodes_watched }));
check('move-to-want clears rating + episode count', mtw.json?.rating == null && (mtw.json?.episodes_watched ?? 1) === 0);
prog = await api(`/library/tv/${TV}/episodes`, { token });
check('move-to-want deletes episode progress', (prog.json?.watched?.length ?? -1) === 0);
mine = await api('/reviews/mine', { token });
check('move-to-want deletes all title reviews', (mine.json?.reviews ?? []).filter((r) => r.tmdb_id === TV).length === 0);

// 3. Remove cascades episode progress + reviews
await api(`/library/tv/${TV}`, { method: 'PATCH', token, body: { status: 'watching' } });
await api(`/library/tv/${TV}/episodes`, { method: 'PUT', token, body: { season: 1, episode: 3, watched: true } });
await api(`/reviews/tv/${TV}`, { method: 'PUT', token, body: { rating: 5, seasonNumber: 1 } });
const rem = await api(`/library/tv/${TV}`, { method: 'DELETE', token });
check('remove returns removed:true', rem.json?.removed === true);
prog = await api(`/library/tv/${TV}/episodes`, { token });
check('remove cascades episode progress', (prog.json?.watched?.length ?? -1) === 0);
mine = await api('/reviews/mine', { token });
check('remove cascades reviews', (mine.json?.reviews ?? []).filter((r) => r.tmdb_id === TV).length === 0);
const item = await api(`/library/tv/${TV}`, { token });
check('removed item no longer in library', item.status === 404 || item.json == null || item.json?.status == null, `status=${item.status}`);

// 4. title-stats is public
const stats = await api(`/title-stats/movie/550`);
check('title-stats public, has counts', stats.status === 200 && typeof stats.json?.want === 'number' && typeof stats.json?.reviews === 'number', JSON.stringify(stats.json));

// 5. Whole-series unwatch (client sequence: per-season unwatch + per-season
// review delete + season-0 review delete) clears everything in scope
await api(`/library/tv/${TV}`, { method: 'PUT', token, body: { mediaType: 'tv', tmdbId: TV, title: 'Fixture Series', status: 'watching', totalEpisodes: 20 } });
await api(`/library/tv/${TV}/episodes`, { method: 'PUT', token, body: { season: 1, episode: 1, watched: true } });
await api(`/library/tv/${TV}/episodes`, { method: 'PUT', token, body: { season: 2, episode: 1, watched: true } });
await api(`/reviews/tv/${TV}`, { method: 'PUT', token, body: { rating: 9, seasonNumber: 1 } });
await api(`/reviews/tv/${TV}`, { method: 'PUT', token, body: { rating: 8, seasonNumber: 2 } });
await api(`/reviews/tv/${TV}`, { method: 'PUT', token, body: { rating: 7, seasonNumber: 0 } });
for (const sn of [1, 2]) {
  await api(`/library/tv/${TV}/seasons/${sn}`, { method: 'PUT', token, body: { watched: false } });
  await api(`/reviews/tv/${TV}?season=${sn}`, { method: 'DELETE', token });
}
await api(`/reviews/tv/${TV}?season=0`, { method: 'DELETE', token });
prog = await api(`/library/tv/${TV}/episodes`, { token });
check('series unwatch clears all episode progress', (prog.json?.watched?.length ?? -1) === 0);
mine = await api('/reviews/mine', { token });
check('series unwatch clears ALL reviews incl season 0', (mine.json?.reviews ?? []).filter((r) => r.tmdb_id === TV).length === 0);
await api(`/library/tv/${TV}`, { method: 'DELETE', token });

console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURES`);
process.exit(failures ? 1 : 0);
