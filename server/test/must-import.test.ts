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
    async batch() { throw new Error('unused'); },
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

test('creates movie, review, provenance without using source time as added_at', async () => {
  const { results } = await lib.importMust('u1', { items: [movie()] });
  assert.equal(results[0].outcome, 'created');
  const row = sqlite.prepare("SELECT * FROM library_items WHERE tmdb_id=10").get() as any;
  assert.equal(row.rating, 8);
  assert.equal(row.status, 'watched');
  assert.notEqual(row.added_at.slice(0, 4), '2025');
  assert.equal(count('reviews', "WHERE body='good' AND season_number=0"), 1);
  assert.equal((sqlite.prepare('SELECT source_modified_at s FROM import_sources').get() as any).s, '2025-01-01T00:00:00Z');
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
