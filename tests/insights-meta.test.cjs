const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

// Exercise the Insights metadata aggregation rules (insightsMetaCore.ts) without React,
// a native runtime or network: account isolation, late-response races, version-based
// freshness and honest coverage/floors.
function load(rel, stubs) {
  const source = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const context = {
    exports: {},
    require(name) {
      const hit = Object.entries(stubs).find(([suffix]) => name.endsWith(suffix));
      if (hit) return hit[1];
      throw Error('Unexpected module ' + name);
    },
  };
  vm.runInNewContext(compiled, context);
  return context.exports;
}
const genres = load('src/api/genres.ts', {});
const core = load('src/screens/Profile/insightsMetaCore.ts', { '/genres': genres });

const item = (over) => ({
  id: 'x', media_type: 'movie', tmdb_id: 1, title: 'T', poster_path: null,
  backdrop_path: null, release_date: null, status: 'watched', rating: null,
  episodes_watched: 0, total_episodes: 0, added_at: 'a', updated_at: 't1', ...over,
});

test('account switch drops the previous account private progress', () => {
  const s = core.emptyMetaState();
  assert.equal(core.ensureOwner(s, 'user-a'), true);
  core.applyProgress(s, 'user-a', 9, [{ season: 1, episode: 1 }], 't1');
  assert.deepEqual(JSON.stringify(Object.keys(s.watchedEps)), JSON.stringify(['9']));
  assert.equal(core.ensureOwner(s, 'user-b'), true);
  assert.equal(JSON.stringify(s.watchedEps), '{}');
  assert.equal(JSON.stringify(s.epVersionSeen), '{}');
  assert.equal(core.ensureOwner(s, 'user-b'), false); // same account: no reset
});

test('logout clears ownership and private progress exactly once', () => {
  const s = core.emptyMetaState();
  assert.equal(core.clearOwner(s), false); // already clean
  core.ensureOwner(s, 'user-a');
  core.applyProgress(s, 'user-a', 9, [{ season: 1, episode: 2 }], 't1');
  assert.equal(core.clearOwner(s), true);
  assert.equal(s.owner, undefined);
  assert.equal(JSON.stringify(s.watchedEps), '{}');
  assert.equal(core.clearOwner(s), false);
});

test('late response from a previous account is discarded', () => {
  const s = core.emptyMetaState();
  core.ensureOwner(s, 'user-a');
  // fetch started as A resolves after the device switched to B
  core.ensureOwner(s, 'user-b');
  assert.equal(core.applyProgress(s, 'user-a', 9, [{ season: 1, episode: 1 }], 't1'), false);
  assert.equal(JSON.stringify(s.watchedEps), '{}');
  // the owning account's own response lands
  assert.equal(core.applyProgress(s, 'user-b', 9, [{ season: 2, episode: 3 }], 't2'), true);
  assert.equal(JSON.stringify(s.watchedEps[9]), JSON.stringify([{ season: 2, episode: 3 }]));
});

test('same-count watch toggles still refetch: updated_at is the version', () => {
  const s = core.emptyMetaState();
  core.ensureOwner(s, 'user-a');
  const before = item({ media_type: 'tv', tmdb_id: 7, episodes_watched: 5, updated_at: 't1' });
  assert.equal(core.needsProgressFetch(s, before), true); // never fetched
  core.applyProgress(s, 'user-a', 7, [], 't1');
  assert.equal(core.needsProgressFetch(s, before), false); // unchanged version
  // unwatch ep3 + watch ep4: count stays 5, but the server bumps updated_at
  const after = { ...before, updated_at: 't2' };
  assert.equal(core.needsProgressFetch(s, after), true);
});

test('genre tally counts known titles only, primary genre, with floor', () => {
  const movie = (id) => item({ tmdb_id: id });
  const items = [1, 2, 3, 4, 5, 6].map(movie);
  const cache = { titles: {}, seasons: {} };
  // 4 known of 6: below the floor, tile hidden
  for (const id of [1, 2, 3, 4]) cache.titles[`movie:${id}`] = { g: [28, 12] }; // Action primary
  let r = core.computeInsights(items, cache, {}, true);
  assert.equal(r.topGenre, undefined);
  // 5 known of 6: tile shows with honest coverage
  cache.titles['movie:5'] = { g: [35] }; // Comedy primary
  r = core.computeInsights(items, cache, {}, true);
  assert.equal(r.topGenre.name, 'Action'); // 4 vs 1
  assert.equal(r.topGenre.known, 5);
  assert.equal(r.topGenre.total, 6);
  // unknown genre ids never count
  cache.titles['movie:6'] = { g: [999999] };
  r = core.computeInsights(items, cache, {}, true);
  assert.equal(r.topGenre.known, 5);
});

test('time watched sums verified minutes only and reports coverage', () => {
  const items = [
    item({ tmdb_id: 1, runtime: undefined }), // watched movie, runtime known below
    item({ tmdb_id: 2 }), // watched movie, runtime unknown
    item({ tmdb_id: 3 }), // watched movie, runtime known below
    item({ media_type: 'tv', tmdb_id: 9, episodes_watched: 2, updated_at: 't1' }),
  ];
  const cache = {
    titles: { 'movie:1': { g: [], r: 100 }, 'movie:2': { g: [] }, 'movie:3': { g: [], r: 90 } },
    seasons: { '9:1': { 1: 40, 2: 0 } }, // ep2 runtime unknown
  };
  const watchedEps = { 9: [{ season: 1, episode: 1 }, { season: 1, episode: 2 }] };
  const r = core.computeInsights(items, cache, watchedEps, true);
  assert.equal(r.timeWatched.minutes, 230); // 100 + 90 + 40, never estimated
  assert.equal(r.timeWatched.moviesKnown, 2);
  assert.equal(r.timeWatched.moviesTotal, 3);
  assert.equal(r.timeWatched.epsKnown, 1);
  assert.equal(r.timeWatched.epsTotal, 2);
});

test('progress from another account never feeds the tile', () => {
  const items = [
    item({ tmdb_id: 1 }), item({ tmdb_id: 2 }), item({ tmdb_id: 3 }),
    item({ media_type: 'tv', tmdb_id: 9, episodes_watched: 2, updated_at: 't1' }),
  ];
  const cache = {
    titles: { 'movie:1': { g: [], r: 20 }, 'movie:2': { g: [], r: 20 }, 'movie:3': { g: [], r: 20 } },
    seasons: { '9:1': { 1: 40, 2: 40 } },
  };
  const watchedEps = { 9: [{ season: 1, episode: 1 }, { season: 1, episode: 2 }] };
  const leaked = core.computeInsights(items, cache, watchedEps, false);
  assert.equal(leaked.timeWatched.epsKnown, 0); // owner mismatch: episodes not counted
  assert.equal(leaked.timeWatched.minutes, 60); // only the public movie runtimes remain
  const own = core.computeInsights(items, cache, watchedEps, true);
  assert.equal(own.timeWatched.minutes, 140);
  assert.equal(own.timeWatched.epsKnown, 2);
});
