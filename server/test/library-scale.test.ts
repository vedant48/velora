/**
 * Real-scale library: the owner's imported library was 1404 items, and a 1000-row list cap
 * (newest updated first) dropped every older Want item so the Want tab rendered empty.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { LibraryService } from '../src/modules/library/library.service';
import { UsersService } from '../src/modules/users/users.service';
import type { DatabaseService } from '../src/common/database.service';

function setup() {
  const sqlite = new DatabaseSync(':memory:');
  for (const f of ['0001_init.sql', '0002_privacy.sql', '0003_episode_progress.sql', '0004_avatars.sql', '0005_import_sources.sql']) sqlite.exec(readFileSync(join(process.cwd(), 'migrations', f), 'utf8'));
  const db = {
    async all<T>(sql: string, p: unknown[] = []) { return sqlite.prepare(sql).all(...(p as never[])) as T[]; },
    async first<T>(sql: string, p: unknown[] = []) { return (sqlite.prepare(sql).get(...(p as never[])) as T) ?? null; },
    async run(sql: string, p: unknown[] = []) { const r = sqlite.prepare(sql).run(...(p as never[])); return { meta: { changes: Number(r.changes) } }; },
  } as unknown as DatabaseService;
  sqlite.prepare("INSERT INTO users (id, username, display_name) VALUES ('u1','a','A')").run();
  return { sqlite, db };
}

test('1404-item library is returned whole, Want items (oldest updated_at) included, and stats follow the owner tab rules', async () => {
  const { sqlite, db } = setup();
  const ins = sqlite.prepare(`INSERT INTO library_items (id, user_id, media_type, tmdb_id, title, status, added_at, updated_at) VALUES (?, 'u1', ?, ?, ?, ?, ?, ?)`);
  let n = 0, t = 0;
  // Wants were saved first (oldest updated_at), watched/watching later: the shape that tripped the old cap.
  for (const [m, s, c] of [['movie', 'want', 330], ['tv', 'want', 43], ['movie', 'watched', 899], ['tv', 'watched', 52], ['tv', 'watching', 80]] as const) {
    for (let i = 0; i < c; i++) {
      n++; t++;
      const ts = new Date(Date.UTC(2026, 10, 24, 19, 0, 0) + t * 1000).toISOString();
      ins.run(`i${n}`, m, n, `${m} ${n}`, s, ts, ts);
    }
  }
  assert.equal(n, 1404);
  const { items } = await new LibraryService(db).list('u1');
  assert.equal(items.length, 1404);
  assert.equal((items as any[]).filter((i) => i.status === 'want').length, 373);
  const st = await new UsersService(db).stats('u1');
  assert.equal(st.want, 373);
  assert.equal(st.watched, 899);
  assert.equal(st.series, 132);
});
