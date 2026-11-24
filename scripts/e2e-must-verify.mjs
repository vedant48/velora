// Verifies the merge result in the LOCAL synthetic backend after the emulator flow.
const API = 'http://127.0.0.1:8787/api';
const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'e2e_alice', password: 'e2e-alice-pass-1' }) });
const { token } = await r.json();
const H = { Authorization: `Bearer ${token}` };
const lib = (await (await fetch(`${API}/library`, { headers: H })).json()).items;
const by = (t) => lib.find((i) => i.title === t);
const out = {};
const fail = [];
const expect = (name, cond, extra) => { out[name] = cond; if (!cond) fail.push(name + ' ' + JSON.stringify(extra ?? '')); };
const inc = by('Inception');
expect('inception_not_overwritten_status_watched', inc?.status === 'watched', inc);
expect('inception_rating_not_overwritten', inc?.rating === null, inc);
const mx = by('The Matrix');
expect('matrix_created_watched_rating10', mx?.status === 'watched' && mx?.rating === 10, mx);
const ch = by('Chernobyl');
expect('chernobyl_watching_3_eps', ch?.status === 'watching' && ch?.episodes_watched === 3, ch);
const bear = by('The Bear');
expect('bear_want_no_episodes', bear?.status === 'want' && bear?.episodes_watched === 0, bear);
expect('matrix_added_at_is_source_modified_fallback', mx && String(mx.added_at).startsWith('2025-01-02'), mx);
if (mx) {
  const rv = (await (await fetch(`${API}/reviews/movie/${mx.tmdb_id}`, { headers: H })).json()).reviews ?? [];
  expect('matrix_review_body', rv.some((x) => x.body === 'SYNTHETIC REVIEW BODY'), rv);
}
if (inc) {
  const rv = (await (await fetch(`${API}/reviews/movie/${inc.tmdb_id}`, { headers: H })).json()).reviews ?? [];
  expect('inception_no_review_added', !rv.some((x) => x.body !== 'Synthetic local motion check'), rv);
}
if (ch) {
  const ep = await (await fetch(`${API}/library/tv/${ch.tmdb_id}/episodes`, { headers: H })).json();
  console.log('episodes', JSON.stringify(ep));
}
console.log(JSON.stringify({ lib: lib.map((i) => [i.title, i.status, i.rating, i.episodes_watched]), out }, null, 1));
if (fail.length) { console.error('FAILED', fail); process.exit(1); }
