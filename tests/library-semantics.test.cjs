const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the actual domain hook without a native runtime or real network.
const source = fs.readFileSync(require.resolve('../src/hooks/useLibraryItem.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function fixture(initial = null) {
  let row = initial, cursor = 0;
  const state = [], calls = [], reviews = new Map();
  const api = {
    lookup: async () => ({ states: { 'movie:17': row } }),
    upsertItem: async body => { calls.push(['create', body]); row = { ...body, id: 'fixture', status: body.status }; return row; },
    patchItem: async (type, id, patch) => { calls.push(['patch', type, id, patch]); row = { ...row, ...patch }; return row; },
    putReview: async (type, id, body) => { calls.push(['review', type, id, body]); reviews.set(body.seasonNumber ?? 0, body); return body; },
    removeItem: async (type, id) => { calls.push(['remove', type, id]); row = null; reviews.clear(); return { removed: true }; },
    moveToWant: async (type, id) => { calls.push(['moveToWant', type, id]); row = { ...row, status: 'want', rating: null, episodes_watched: 0 }; reviews.clear(); return row; },
  };
  const owner = { id: 'fixture-user' };
  const context = { exports: {}, require(name) {
    if (name === 'react') return { useCallback: fn => fn, useEffect: () => {}, useState(initial) {
      const slot = cursor++; if (!(slot in state)) state[slot] = initial;
      return [state[slot], value => { state[slot] = value; }];
    } };
    if (name.endsWith('/AuthContext')) return { useAuth: () => ({ user: owner, apiReady: true }) };
    if (name.endsWith('/velora')) return { veloraApi: api };
    throw Error('Unexpected module ' + name);
  } };
  vm.runInNewContext(compiled, context);
  const meta = { mediaType: 'movie', tmdbId: 17, title: 'Synthetic title', posterPath: null, backdropPath: null };
  return { calls, reviews, api, render() { cursor = 0; return context.exports.useLibraryItem(meta); } };
}
test('direct Watched creates status and whole-title review, not a library rating', async () => {
  const f = fixture(); assert.equal(await f.render().setStatusWithReview('watched', 8, 'Review'), true);
  assert.equal(f.calls[0][0], 'create'); assert.equal(f.calls[0][1].status, 'watched'); assert.equal(f.calls[0][1].rating, null);
  assert.equal(f.reviews.get(0).rating, 8); assert.equal(f.reviews.get(0).body, 'Review');
});
test('moving existing Want to Watched uses the same review path', async () => {
  const f = fixture({ status: 'want', rating: null }); await f.render().reload();
  await f.render().setStatusWithReview('watched', 7, 'Moved');
  assert.equal(f.calls[0][0], 'patch'); assert.equal(f.calls[0][3].status, 'watched'); assert.equal(f.reviews.get(0).rating, 7);
});
test('removal clears local tracking; a fresh unrated re-add does not reuse a review', async () => {
  const f = fixture({ status: 'watched', rating: null }); await f.render().reload();
  await f.render().removeItem(); assert.equal(f.render().status, null);
  await f.render().setStatusWithReview('watched', null, '');
  assert.equal(f.calls[0][0], 'remove'); assert.equal(f.calls[1][0], 'create'); assert.equal(f.reviews.size, 0);
});
test('season review writes keep season keys independent and do not alter title status', async () => {
  const f = fixture({ status: 'watching' }); await f.render().reload();
  await f.render().saveReview(8, 'Season two', 2); await f.render().saveReview(5, 'Season three', 3);
  assert.equal(f.reviews.get(2).rating, 8); assert.equal(f.reviews.get(3).rating, 5);
  assert.equal(f.calls.some(c => c[0] === 'patch' || c[0] === 'create'), false);
});
test('failed save is reported false and releases saving state', async () => {
  const f = fixture(); f.api.upsertItem = async () => { throw Error('Synthetic offline'); };
  assert.equal(await f.render().setStatusWithReview('watched', 8, 'Keep draft'), false);
  assert.equal(f.render().saving, false); assert.equal(f.reviews.size, 0);
});
