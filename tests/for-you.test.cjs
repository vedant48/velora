const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../src/api/forYou.ts'), 'utf8');
const exportsObject = {};
vm.runInNewContext(
  ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  { exports: exportsObject, require: () => ({}) },
);
const { pickSeeds, filterFresh } = exportsObject;

const item = (tmdb_id, media_type, rating, updated_at = '2026-11-01') => ({
  id: `x${tmdb_id}`, tmdb_id, media_type, title: `T${tmdb_id}`, rating,
  status: 'watched', updated_at, added_at: updated_at,
  poster_path: null, backdrop_path: null, release_date: null,
  episodes_watched: 0, total_episodes: 0,
});

test('seeds are the top rated of one media type only', () => {
  const lib = [item(1, 'movie', 9), item(2, 'movie', 5), item(3, 'movie', 8), item(4, 'tv', 10), item(5, 'movie', 4)];
  assert.deepEqual([...pickSeeds(lib, 'movie', 2, 0)].map(i => i.tmdb_id), [1, 3]);
  assert.deepEqual([...pickSeeds(lib, 'tv', 2, 0)].map(i => i.tmdb_id), [4]);
});

test('rotation shifts the seed window so refreshes vary', () => {
  const lib = [item(1, 'movie', 9), item(2, 'movie', 8), item(3, 'movie', 7), item(4, 'movie', 6)];
  assert.deepEqual([...pickSeeds(lib, 'movie', 2, 0)].map(i => i.tmdb_id), [1, 2]);
  assert.deepEqual([...pickSeeds(lib, 'movie', 2, 1)].map(i => i.tmdb_id), [2, 3]);
  assert.deepEqual([...pickSeeds(lib, 'movie', 2, 3)].map(i => i.tmdb_id), [4, 1]);
});

test('recommendations exclude tracked titles, the seed itself and duplicates', () => {
  const seed = item(10, 'movie', 9);
  const recs = [
    { id: 10, media_type: 'movie' },
    { id: 11, media_type: 'movie' },
    { id: 11, media_type: 'movie' },
    { id: 12, media_type: 'movie' },
    { id: 13, media_type: 'movie' },
  ];
  const tracked = { 'movie:12': 'watched', 'movie:14': 'want' };
  assert.deepEqual([...filterFresh(recs, tracked, seed)].map(i => i.id), [11, 13]);
});
