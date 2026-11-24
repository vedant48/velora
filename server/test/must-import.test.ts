/**
 * Must import merge semantics against a real SQLite database with the production migrations.
 * Covers: create, never overwrite existing titles/reviews/ratings, idempotent re-run,
 * additive episode fill for an existing show, per-user isolation, provenance row, validation.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { LibraryService } from '../src/modules/library/library.service';
import type { DatabaseService } from '../src/common/database.service';

function makeDb() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of ['0001_init.sql', '0002_privacy.sql', '0003_episode_progress.sql', '0004_avatars.sql', '0005_import_sources.sql']) {
    sqlite.exec(readFileSync(join(process.cwd(), 'migrations', file), 'utf8'));
  }
  const service = {
    async all<T>(sql: string, params: unknown[] = []): Promise<T[]> { return sqlite.prepare(sql).all(...(params as never[])) as T[]; },
    async first<T>(sql: string, params: unknown[] = []): Promise<T | null> { return (sqlite.prepare(sql).get(...(params as never[])) as T) ?? null; },
    async run(sql: string, params: unknown[] = []) {
      const r = sqlite.prepare(sql).run(...(params as never[]));
      return { meta: { changes: Number(r.changes) } };
    },
    async batch(statements: { sql: string; params: unknown[] }[]) {
      // Mirrors D1: one transaction, one result per statement.
      sqlite.exec('BEGIN');
      try {
        const out = statements.map((s) => ({ meta: { changes: Number(sqlite.prepare(s.sql).run(...(s.params as never[])).changes) } }));
        sqlite.exec('COMMIT');
        return out;
      } catch (e) { sqlite.exec('ROLLBACK'); throw e; }
    },
  } as unknown as DatabaseService;
  return { sqlite, service };
}

let sqlite: DatabaseSync;
let lib: LibraryService;
beforeEach(() => {
  const m = makeDb();
  sqlite = m.sqlite;
  lib = new LibraryService(m.service);
  sqlite.prepare("INSERT INTO users (id, username, display_name) VALUES ('u1','a','A'),('u2','b','B')").run();
});

const movie = (over = {}) => ({ mustId: 'm1', mediaType: 'movie', tmdbId: 10, title: 'Film', status: 'watched', rating: 8,
  review: { body: 'good' }, sourceModifiedAt: '2025-01-01T00:00:00Z', totalEpisodes: 0, seasons: [], ...over });
const show = (over = {}) => ({ mustId: 's1', mediaType: 'tv', tmdbId: 20, title: 'Show', status: 'watching', rating: null,
  review: null, sourceModifiedAt: null, totalEpisodes: 6,
  seasons: [{ season: 1, rating: 7, review: null, watchedEpisodes: [1, 2, 3] }], ...over });
const count = (t: string, w = '') => (sqlite.prepare(`SELECT COUNT(*) c FROM ${t} ${w}`).get() as { c: number }).c;

test('creates movie, review, provenance; source modified time is the flagged fallback added_at', async () => {
  const { results } = await lib.importMust('u1', { items: [movie()] });
  assert.equal(results[0].outcome, 'created');
  const row = sqlite.prepare("SELECT * FROM library_items WHERE tmdb_id=10").get() as any;
  assert.equal(row.rating, 8);
  assert.equal(row.status, 'watched');
  assert.equal(row.added_at, '2025-01-01 00:00:00');
  assert.equal((sqlite.prepare('SELECT added_at_is_fallback f FROM import_sources').get() as any).f, 1);
  assert.equal(count('reviews', "WHERE body='good' AND season_number=0"), 1);
  assert.equal((sqlite.prepare('SELECT source_modified_at s FROM import_sources').get() as any).s, '2025-01-01T00:00:00Z');
});

test('missing or future source time keeps default added_at, unflagged', async () => {
  await lib.importMust('u1', { items: [show(), movie({ sourceModifiedAt: '2999-01-01T00:00:00Z', tmdbId: 11, mustId: 'm2' })] });
  const y = new Date().getFullYear().toString();
  const rows = sqlite.prepare('SELECT added_at a FROM library_items').all() as any[];
  for (const r of rows) assert.equal(r.a.slice(0, 4), y);
  assert.equal(count('import_sources', 'WHERE added_at_is_fallback=1'), 0);
});

test('never overwrites an existing title, rating or review', async () => {
  await lib.upsert('u1', 'movie', 10, { title: 'Mine', status: 'want', rating: 3 });
  const { results } = await lib.importMust('u1', { items: [movie()] });
  assert.equal(results[0].outcome, 'existing_kept');
  const row = sqlite.prepare('SELECT * FROM library_items WHERE tmdb_id=10').get() as any;
  assert.equal(row.title, 'Mine'); assert.equal(row.status, 'want'); assert.equal(row.rating, 3);
  assert.equal(count('reviews'), 0);
});

test('re-running is idempotent, null rating stays null', async () => {
  const item = movie({ rating: null, review: null });
  await lib.importMust('u1', { items: [item] });
  await lib.importMust('u1', { items: [item] });
  assert.equal(count('library_items'), 1);
  assert.equal(count('import_sources'), 1);
  assert.equal((sqlite.prepare('SELECT rating r FROM library_items').get() as any).r, null);
});

test('episodes, season rating and counts; additive fill on re-import', async () => {
  const r1 = await lib.importMust('u1', { items: [show()] });
  assert.equal(r1.results[0].episodesAdded, 3);
  assert.equal(count('episode_progress'), 3);
  assert.equal((sqlite.prepare("SELECT episodes_watched e FROM library_items WHERE tmdb_id=20").get() as any).e, 3);
  assert.equal((sqlite.prepare("SELECT rating r FROM reviews WHERE season_number=1").get() as any).r, 7);
  const more = show({ seasons: [{ season: 1, rating: 5, review: null, watchedEpisodes: [1, 2, 3, 4] }] });
  const r2 = await lib.importMust('u1', { items: [more] });
  assert.equal(r2.results[0].outcome, 'existing_kept');
  assert.equal(r2.results[0].episodesAdded, 1);
  assert.equal(count('episode_progress'), 4);
  assert.equal((sqlite.prepare("SELECT rating r FROM reviews WHERE season_number=1").get() as any).r, 7); // not overwritten
});

test('users are isolated and bad rows fail alone', async () => {
  await lib.importMust('u1', { items: [movie()] });
  const { results } = await lib.importMust('u2', { items: [movie(), movie({ mustId: 'bad', tmdbId: 0 })] });
  assert.equal(results[0].outcome, 'created');
  assert.equal(results[1].outcome, 'failed');
  assert.equal(count('library_items'), 2);
  await assert.rejects(lib.importMust('u1', { items: [] }));
});

test('large batch uses few D1 round trips and writes every episode', async () => {
  const m = makeDb();
  let calls = 0;
  const wrapped = new Proxy(m.service as any, { get: (t, k) => (typeof t[k] === 'function' ? (...a: unknown[]) => { calls++; return t[k](...a); } : t[k]) });
  const l = new LibraryService(wrapped);
  m.sqlite.prepare("INSERT INTO users (id, username, display_name) VALUES ('u1','a','A')").run();
  const items = Array.from({ length: 25 }, (_, n) => show({ mustId: `s${n}`, tmdbId: 1000 + n, totalEpisodes: 120,
    seasons: [1, 2].map((sn) => ({ season: sn, rating: null, review: null, watchedEpisodes: Array.from({ length: 60 }, (_, e) => e + 1) })) }));
  const { results } = await l.importMust('u1', { items });
  assert.equal(results.filter((r) => r.outcome === 'created').length, 25);
  assert.equal(results.reduce((a, r) => a + r.episodesAdded, 0), 3000);
  assert.equal((m.sqlite.prepare('SELECT COUNT(*) c FROM episode_progress').get() as any).c, 3000);
  assert.equal((m.sqlite.prepare("SELECT episodes_watched w FROM library_items WHERE tmdb_id=1000").get() as any).w, 120);
  console.log('D1 calls for 25 titles / 3000 episodes:', calls);
  assert.ok(calls <= 25 * 5, `too many calls: ${calls}`);
});

test('a title that fails validation writes nothing and a rerun fills it fully; existing show gets missing episodes', async () => {
  const bad = show({ seasons: [{ season: 1, rating: null, review: null, watchedEpisodes: [1, 2, 'x'] }] });
  const r1 = await lib.importMust('u1', { items: [bad] });
  assert.equal(r1.results[0].outcome, 'failed');
  assert.equal(count('library_items'), 0); assert.equal(count('episode_progress'), 0);
  await lib.upsert('u1', 'tv', 20, { title: 'Mine', status: 'watching', rating: 5 });
  const r2 = await lib.importMust('u1', { items: [show()] });
  assert.equal(r2.results[0].outcome, 'existing_kept'); assert.equal(r2.results[0].episodesAdded, 3);
  const r3 = await lib.importMust('u1', { items: [show()] });
  assert.equal(r3.results[0].episodesAdded, 0);
  assert.equal((sqlite.prepare('SELECT title t, rating r FROM library_items WHERE tmdb_id=20').get() as any).t, 'Mine');
});

test('review recovery: interrupted Must title gets its review, user titles and existing reviews are untouched', async () => {
  // Title + provenance saved by an interrupted earlier import, review lost.
  await lib.upsert('u1', 'movie', 10, { title: 'Film', status: 'watched', rating: 8 });
  sqlite.prepare("INSERT INTO import_sources (id, user_id, source, source_id, media_type, tmdb_id) VALUES ('x','u1','must','m1','movie',10)").run();
  // Title the user already had (no earlier Must provenance) with no review.
  await lib.upsert('u1', 'movie', 11, { title: 'Mine', status: 'watched', rating: 5 });
  // Interrupted title whose review the user has since written themselves.
  await lib.upsert('u1', 'movie', 12, { title: 'Own', status: 'watched', rating: 6 });
  sqlite.prepare("INSERT INTO import_sources (id, user_id, source, source_id, media_type, tmdb_id) VALUES ('y','u1','must','m3','movie',12)").run();
  sqlite.prepare("INSERT INTO reviews (id, user_id, media_type, tmdb_id, season_number, rating, body) VALUES ('r','u1','movie',12,0,6,'my words')").run();
  const { results } = await lib.importMust('u1', { items: [
    movie(), movie({ mustId: 'm2', tmdbId: 11, review: { body: 'must text 2' } }), movie({ mustId: 'm3', tmdbId: 12, review: { body: 'must text 3' } }) ] });
  assert.deepEqual(results.map((r) => r.outcome), ['existing_kept', 'existing_kept', 'existing_kept']);
  const body = (id: number) => (sqlite.prepare('SELECT body b FROM reviews WHERE tmdb_id=? AND season_number=0').get(id) as any)?.b;
  assert.equal(body(10), 'good');
  assert.equal(body(11), undefined);
  assert.equal(body(12), 'my words');
  assert.equal((sqlite.prepare('SELECT rating r, status s FROM library_items WHERE tmdb_id=10').get() as any).r, 8);
});
