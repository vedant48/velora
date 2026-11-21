// End-to-end smoke test against a local `wrangler dev` instance (workerd runtime).
// Usage: node scripts/smoke.mjs [baseUrl]
const base = process.argv[2] ?? 'http://localhost:8787';
let failures = 0;
const check = (name, cond) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) failures++;
};
const api = async (path, { method = 'GET', token, body } = {}) => {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
};

const t0 = Date.now();
const health = await api('/health');
check('health endpoint', health.status === 200 && health.json?.ok === true);
console.log(`  (first request latency: ${Date.now() - t0}ms - includes isolate cold start + NestJS bootstrap)`);

const un = `smoke_${Date.now() % 100000}`;
const badSignup = await api('/auth/signup', { method: 'POST', body: { username: 'x', password: '123456' } });
check('signup validates username format', badSignup.status === 400);

const su = await api('/auth/signup', { method: 'POST', body: { username: un, password: 'secret123', displayName: 'Smoke Test' } });
check('signup works', su.status === 201 || su.status === 200);
const token = su.json?.token;
check('signup returns JWT', typeof token === 'string' && token.split('.').length === 3);

const dup = await api('/auth/signup', { method: 'POST', body: { username: un, password: 'secret123' } });
check('duplicate username rejected', dup.status === 409);

const badLogin = await api('/auth/login', { method: 'POST', body: { username: un, password: 'wrong' } });
check('wrong password rejected', badLogin.status === 401);

const login = await api('/auth/login', { method: 'POST', body: { username: un, password: 'secret123' } });
check('login works', (login.json?.token?.length ?? 0) > 20);

const noAuth = await api('/library');
check('library requires auth', noAuth.status === 401);

const up = await api('/library/movie/550', {
  method: 'PUT', token,
  body: { title: 'Fight Club', status: 'watched', rating: 9, posterPath: '/p.jpg', releaseDate: '1999-10-15' },
});
check('library upsert', up.status === 200 || up.status === 201);

const patched = await api('/library/movie/550', { method: 'PATCH', token, body: { rating: 10 } });
check('rating patch', patched.json?.rating === 10);

const tv = await api('/library/tv/1399', {
  method: 'PUT', token,
  body: { title: 'Game of Thrones', status: 'watching', episodesWatched: 12, totalEpisodes: 73 },
});
check('episode tracking upsert', tv.json?.episodes_watched === 12);
const badEp = await api('/library/tv/1399', { method: 'PATCH', token, body: { episodesWatched: 99, totalEpisodes: 73 } });
check('episode count validated', badEp.status === 400);

const review = await api('/reviews/movie/550', { method: 'PUT', token, body: { body: 'Classic.', rating: 10 } });
check('review upsert', (review.status === 200 || review.status === 201) && review.json?.body === 'Classic.');
const revList = await api('/reviews/movie/550');
check('public review list', revList.json?.reviews?.length >= 1);

// Second user for social
const su2 = await api('/auth/signup', { method: 'POST', body: { username: `${un}_b`, password: 'secret123' } });
const token2 = su2.json?.token;
await api('/library/movie/550', { method: 'PUT', token: token2, body: { title: 'Fight Club', status: 'watched', rating: 9 } });
await api('/library/movie/551', { method: 'PUT', token: token2, body: { title: 'A', status: 'watched', rating: 8 } });
await api('/library/movie/552', { method: 'PUT', token: token2, body: { title: 'B', status: 'watched', rating: 7 } });
await api('/library/movie/551', { method: 'PUT', token, body: { title: 'A', status: 'watched', rating: 8 } });
await api('/library/movie/552', { method: 'PUT', token, body: { title: 'B', status: 'watched', rating: 9 } });
const follow = await api(`/social/follow/${un}_b`, { method: 'POST', token });
check('follow works', follow.json?.following === true);
const match = await api(`/social/match/${un}_b`, { token });
check('match percent computed', typeof match.json?.percent === 'number');
const feed = await api('/social/activity', { token });
check('activity feed', Array.isArray(feed.json?.feed) && feed.json.feed.length > 0);
const profile = await api(`/users/${un}_b`);
check('public profile + stats + rank', profile.json?.stats?.watched === 3 && typeof profile.json?.stats?.rank === 'number');
const pubLib = await api(`/users/${un}_b/library?status=watched`);
check('public library view', pubLib.json?.items?.length === 3);

const exp = await api('/library/export?format=velora', { token });
check('velora export', exp.json?.format === 'velora-export' && exp.json.items.length >= 3);
const expCsv = await api('/library/export?format=simkl', { token });
check('simkl csv export', typeof expCsv.json?.csv === 'string' && expCsv.json.csv.includes('Fight Club'));

// Re-import exported data into a fresh account
const su3 = await api('/auth/signup', { method: 'POST', body: { username: `${un}_c`, password: 'secret123' } });
const imp = await api('/library/import', { method: 'POST', token: su3.json?.token, body: { format: 'velora', data: exp.json } });
check('velora import round-trip', imp.json?.imported >= 3);
const simklImp = await api('/library/import', {
  method: 'POST', token: su3.json?.token,
  body: { format: 'simkl', data: { movies: [{ title: 'Whiplash', ids: { tmdb: 244786 }, user_rating: 8, status: 'completed' }], shows: [] } },
});
check('simkl json import', simklImp.json?.imported === 1);

const warm0 = Date.now();
await api('/health');
console.log(`  (warm request latency: ${Date.now() - warm0}ms)`);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
