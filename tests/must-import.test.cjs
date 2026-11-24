const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const dir = path.join(__dirname, '../src/services/mustImport');
const cache = {};
function load(name) {
  if (cache[name]) return cache[name];
  const out = ts.transpileModule(fs.readFileSync(path.join(dir, name + '.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(out, { module: mod, exports: mod.exports, require: (n) => load(n.replace('./', '')) });
  return (cache[name] = mod.exports);
}
const J = (x) => JSON.parse(JSON.stringify(x));
const { parseMustFiles } = load('parse');
const { chooseMatch, normalizeTitle } = load('match');
const { buildCommitItem, batchEntries } = load('payload');

const rec = (id, type, title, status, extra = {}) => ({
  user_product_info: { product_id: id, status, rate: extra.rate ?? null, reviewed: !!extra.review, modified_at: '2025-01-02T00:00:00Z' },
  product: { id, type, title, release_date: extra.date ?? '2020-05-05', poster_file_path: extra.poster ?? null },
});
const all = {
  product: [
    rec(1, 'movie', 'Film One', 'watched', { rate: 9, review: true, poster: '/p1.jpg' }),
    rec(2, 'movie', 'Film Two', 'want'),
    rec(3, 'show', 'Show', 'watching'),
    rec(4, 'show', 'Wanted Show', 'want'),
    rec(5, 'movie', 'Zero', 'watched', { rate: 0 }),
  ],
  review: [{ user_product_info: { product_id: 1, reviewed: true, review: { reviewed_at: '2025-03-03T00:00:00Z', body: 'great' } } }],
};
const shows = {
  detail: { 3: { show: { seasons: [{ season_id: 30, number: 1, episodes: [31, 32, 33] }, { season_id: 40, number: 2, episodes: [41, 42] }] } } },
  rows: {
    30: { p: { user_product_info: { rate: 7 } }, r: { user_product_info: { review: null } } },
    31: { p: { user_product_info: { status: 'watched' } } },
    32: { p: { user_product_info: { status: 'watched' } } },
    33: { p: { user_product_info: { status: null } } },
    40: { p: { user_product_info: { rate: null } } },
    41: { p: { user_product_info: { status: 'watched' } } },
    42: { p: { user_product_info: { status: null } } },
  },
};

test('parser maps lists, ratings, reviews, episodes; keeps nulls and source time', () => {
  const r = parseMustFiles([shows, all]); // order independent
  assert.equal(r.items.length, 5);
  const f = r.items.find((i) => i.mustId === '1');
  assert.equal(f.rating, 9);
  assert.equal(f.review.body, 'great');
  assert.equal(f.modifiedAt, '2025-01-02T00:00:00Z');
  assert.equal(r.items.find((i) => i.mustId === '2').rating, null);
  assert.equal(r.items.find((i) => i.mustId === '5').rating, null); // 0 is not a valid Must rating, never stored as 0
  const s = r.items.find((i) => i.mustId === '3');
  assert.deepEqual(J(s.seasons.map((x) => [x.number, x.rating, x.watchedEpisodes, x.episodeCount])), [[1, 7, [1, 2], 3], [2, null, [1], 2]]);
  assert.equal(r.items.find((i) => i.mustId === '4').seasons, null);
});

test('parser reports unusable input instead of importing nothing silently', () => {
  assert.match(parseMustFiles([{ foo: 1 }]).warnings.join(' '), /No Must profile list/);
});

const cand = (id, title, year, poster = null) => ({ id, title, originalTitle: title, year, releaseDate: `${year}-01-01`, posterPath: poster, backdropPath: null, popularity: 1 });
test('matching: poster, unique title+year are sure; everything else needs a pick', () => {
  const item = { title: 'Film One', year: 2020, posterPath: '/p1.jpg', type: 'movie' };
  assert.equal(chooseMatch(item, [cand(1, 'Other', 1999), cand(2, 'Film One', 2020, '/p1.jpg')]).best.id, 2);
  assert.equal(chooseMatch({ ...item, posterPath: null }, [cand(1, 'Film One', 2020), cand(2, 'Film One', 2018)]).confidence, 'sure');
  assert.equal(chooseMatch({ ...item, posterPath: null }, [cand(1, 'Film One', 2020), cand(2, 'Film One', 2020)]).confidence, 'review');
  assert.equal(chooseMatch({ ...item, posterPath: null }, [cand(1, 'Film One', 2021)]).confidence, 'review');
  assert.equal(chooseMatch(item, []).confidence, 'none');
  assert.equal(normalizeTitle('Amélie & Co.'), 'amelie and co');
});

test('payload: episodes only sent when season counts agree, mismatches are listed as gaps', () => {
  const item = parseMustFiles([all, shows]).items.find((i) => i.mustId === '3');
  const ok = buildCommitItem(item, cand(99, 'Show', 2020), { tmdbCounts: { 1: 3, 2: 2 }, totalEpisodes: 5 });
  assert.deepEqual(J(ok.entry.seasons.map((s) => s.watchedEpisodes)), [[1, 2], [1]]);
  assert.equal(ok.gaps.length, 0);
  const bad = buildCommitItem(item, cand(99, 'Show', 2020), { tmdbCounts: { 1: 4, 2: 2 }, totalEpisodes: 6 });
  assert.deepEqual(J(bad.entry.seasons.map((s) => [s.season, s.watchedEpisodes])), [[1, []], [2, [1]]]);
  assert.match(bad.gaps[0].note, /Season 1: 2 watched episodes not imported/);
  const unknown = buildCommitItem(item, cand(99, 'Show', 2020), { tmdbCounts: null, totalEpisodes: 0 });
  assert.equal(unknown.gaps.length, 2);
  const noDetail = buildCommitItem(parseMustFiles([all]).items.find((i) => i.mustId === '3'), cand(99, 'Show', 2020));
  assert.match(noDetail.gaps[0].note, /no season data/);
});

test('batching respects item and episode limits', () => {
  const e = (n) => ({ seasons: [{ watchedEpisodes: new Array(n).fill(1) }] });
  const b = batchEntries([e(2000), e(2000), e(1), ...Array.from({ length: 30 }, () => e(0))]);
  assert.ok(b.every((x) => x.length <= 25));
  assert.ok(b.every((x) => x.reduce((a, y) => a + y.seasons[0].watchedEpisodes.length, 0) <= 3000));
  assert.equal(b.flat().length, 33);
});

// Optional check against the real personal export when present locally. Never committed or required.
const real = process.env.MUST_EXPORT_DIR;
test('real export totals (local only)', { skip: !real }, () => {
  const a = JSON.parse(fs.readFileSync(path.join(real, 'all.json'), 'utf8'));
  const s = JSON.parse(fs.readFileSync(path.join(real, 'shows.json'), 'utf8'));
  const r = parseMustFiles([a, s]);
  assert.equal(r.items.length, 1440);
  assert.equal(r.items.filter((i) => i.status === 'want').length, 388);
  assert.equal(r.items.filter((i) => i.type === 'movie' && i.status === 'watched').length, 915);
  assert.equal(r.items.filter((i) => i.rating !== null).length, 870);
  assert.equal(r.items.filter((i) => i.review).length, 29);
  const eps = r.items.flatMap((i) => i.seasons ?? []).reduce((n, x) => n + x.watchedEpisodes.length, 0);
  console.log('watched episodes parsed:', eps, 'shows with detail:', r.items.filter((i) => i.seasons).length);
  assert.equal(eps, 553);
});
