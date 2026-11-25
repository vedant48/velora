const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

// Exercise the actual useInsightsMeta hook (not just the pure core): the hook must not
// let an age-fresh but mutation-stale epProgress cache feed Insights. React, the query
// client, AsyncStorage and the API layer are stubbed; effects run synchronously.
const source = fs.readFileSync(path.join(__dirname, '../src/screens/Profile/useInsightsMeta.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

const flush = async () => {
  for (let i = 0; i < 30; i++) await new Promise(r => setImmediate(r));
};
// Server timestamps are UTC "YYYY-MM-DD HH:MM:SS".
const serverTime = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');

function loadCore() {
  const load = (rel, stubs) => {
    const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    const out = ts.transpileModule(src, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const ctx = { exports: {}, require: (name) => {
      const hit = Object.entries(stubs).find(([suffix]) => name.endsWith(suffix));
      if (hit) return hit[1];
      throw Error('Unexpected module ' + name);
    } };
    vm.runInNewContext(out, ctx);
    return ctx.exports;
  };
  const genres = load('src/api/genres.ts', {});
  return load('src/screens/Profile/insightsMetaCore.ts', { '/genres': genres });
}
const core = loadCore();

function fixture({ progressCache, fetchedProgress, tvUpdatedAt }) {
  const slots = [];
  let cursor = 0;
  const fetchCalls = [];
  const queryClient = {
    getQueriesData: () => [],
    getQueryState: (key) => (progressCache && key[0] === 'epProgress' ? progressCache : undefined),
    getQueryData: () => undefined,
    fetchQuery: async ({ queryKey }) => {
      fetchCalls.push(queryKey);
      if (queryKey[0] === 'epProgress') return { watched: fetchedProgress };
      if (queryKey[0] === 'tv_details') return { genres: [{ id: 18, name: 'Drama' }] };
      if (queryKey[0] === 'movie_details') return { genres: [{ id: 28, name: 'Action' }], runtime: 100 };
      return [];
    },
  };
  // Persisted public metadata: one known movie runtime + season runtimes, so tiles can compute.
  const persisted = JSON.stringify({
    titles: { 'movie:1': { g: [28], r: 100 } },
    seasons: { '9:1': { 1: 40, 2: 40 } },
  });
  const context = {
    exports: {},
    require(name) {
      if (name === 'react') return {
        useCallback: fn => fn,
        useMemo: fn => fn(),
        useRef(initial) {
          const slot = cursor++;
          if (!(slot in slots)) slots[slot] = { current: initial };
          return slots[slot];
        },
        useState(initial) {
          const slot = cursor++;
          if (!(slot in slots)) slots[slot] = initial;
          return [slots[slot], value => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }];
        },
        useEffect: fn => { fn(); },
      };
      if (name.endsWith('/react-query')) return { useQueryClient: () => queryClient };
      if (name.includes('async-storage')) return { getItem: async () => persisted, setItem: async () => {} }; // __importDefault wraps this
      if (name.endsWith('/movies')) return { getMovieDetails: async () => ({}) };
      if (name.endsWith('/queries')) return { STALE_TIME: 600000 };
      if (name.endsWith('/tv')) return { getSeasonEpisodes: async () => [], getTVDetails: async () => ({}) };
      if (name.endsWith('/velora')) return { veloraApi: { getEpisodeProgress: async () => ({ watched: [] }) } };
      if (name.endsWith('/insightsMetaCore')) return core;
      throw Error('Unexpected module ' + name);
    },
  };
  vm.runInNewContext(compiled, context);
  const items = [
    { id: 'a', media_type: 'movie', tmdb_id: 1, title: 'M', poster_path: null, backdrop_path: null, release_date: null, status: 'watched', rating: null, episodes_watched: 0, total_episodes: 0, added_at: 'a', updated_at: serverTime(Date.now() - 86400000) },
    { id: 'b', media_type: 'tv', tmdb_id: 9, title: 'S', poster_path: null, backdrop_path: null, release_date: null, status: 'watched', rating: null, episodes_watched: 2, total_episodes: 2, added_at: 'a', updated_at: tvUpdatedAt },
  ];
  return {
    fetchCalls,
    render() { cursor = 0; return context.exports.useInsightsMeta(items, true, true, 'user-a'); },
  };
}

test('age-fresh but mutation-stale progress cache is NOT used: forced refetch', async () => {
  const now = Date.now();
  const f = fixture({
    // Cache is 1 minute old (well within STALE_TIME) but the watch-state mutation is
    // newer (30s ago): age-fresh, mutation-stale. Must not feed Insights.
    progressCache: { data: { watched: [] }, dataUpdatedAt: now - 60000 },
    fetchedProgress: [{ season: 1, episode: 1 }, { season: 1, episode: 2 }],
    tvUpdatedAt: serverTime(now - 30000),
  });
  f.render();
  await flush();
  assert.ok(
    f.fetchCalls.some(k => k[0] === 'epProgress' && k[1] === 9),
    'hook must refetch progress whose cache predates the latest mutation',
  );
  const meta = f.render();
  assert.equal(meta.timeWatched.minutes, 180); // 100 movie + 2 x 40 episodes from the REFETCH
  assert.equal(meta.timeWatched.epsKnown, 2); // the stale empty cache would have given 0
});

test('cache written after the latest mutation is reused without a request', async () => {
  const now = Date.now();
  const f = fixture({
    // Written after the row's updated_at: provably covers the latest mutation.
    progressCache: { data: { watched: [{ season: 1, episode: 1 }, { season: 1, episode: 2 }] }, dataUpdatedAt: now - 60000 },
    fetchedProgress: [],
    tvUpdatedAt: serverTime(now - 120000),
  });
  f.render();
  await flush();
  assert.ok(
    !f.fetchCalls.some(k => k[0] === 'epProgress'),
    'hook must reuse progress cache that covers the latest mutation',
  );
  const meta = f.render();
  assert.equal(meta.timeWatched.minutes, 180);
  assert.equal(meta.timeWatched.epsKnown, 2);
});
