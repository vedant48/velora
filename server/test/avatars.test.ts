/**
 * Avatar feature tests, run against a real SQLite database (node:sqlite)
 * with the production migrations applied. The DatabaseService shape is
 * re-implemented over DatabaseSync so the actual SQL in UsersService runs.
 *
 * Covers: upload validation (empty/oversize/magic bytes), ownership
 * isolation, replace + version-key consistency, remove, account deletion
 * purge, 404 + short-cache/ETag/304 controller behavior, auth guard
 * rejection, and the avatarAt null fallback carried in user payloads.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { UsersService } from '../src/modules/users/users.service';
import { UsersController } from '../src/modules/users/users.controller';
import { AuthGuard } from '../src/common/auth.guard';
import { setEnv } from '../src/env';
import type { DatabaseService } from '../src/common/database.service';

/** Minimal valid image fixtures: real magic bytes, padding to vary size. */
function jpeg(size: number): Uint8Array {
  const b = new Uint8Array(size);
  b[0] = 0xff; b[1] = 0xd8; b[2] = 0xff; b[3] = 0xe0;
  return b;
}
function png(size: number): Uint8Array {
  const b = new Uint8Array(size);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return b;
}

function makeDb() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of ['0001_init.sql', '0002_privacy.sql', '0003_episode_progress.sql', '0004_avatars.sql']) {
    sqlite.exec(readFileSync(join(process.cwd(), 'migrations', file), 'utf8'));
  }
  const service = {
    async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      return sqlite.prepare(sql).all(...(params as never[])) as T[];
    },
    async first<T>(sql: string, params: unknown[] = []): Promise<T | null> {
      return (sqlite.prepare(sql).get(...(params as never[])) as T) ?? null;
    },
    async run(sql: string, params: unknown[] = []) {
      return sqlite.prepare(sql).run(...(params as never[]));
    },
    async batch(statements: { sql: string; params: unknown[] }[]) {
      sqlite.exec('BEGIN');
      try {
        for (const s of statements) sqlite.prepare(s.sql).run(...(s.params as never[]));
        sqlite.exec('COMMIT');
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  } as unknown as DatabaseService;
  return { sqlite, service };
}

function seedUsers(sqlite: DatabaseSync) {
  sqlite.prepare("INSERT INTO users (id, username, display_name) VALUES ('u1', 'alice', 'Alice'), ('u2', 'bob', 'Bob')").run();
}

let sqlite: DatabaseSync;
let users: UsersService;
beforeEach(() => {
  const made = makeDb();
  sqlite = made.sqlite;
  users = new UsersService(made.service);
  seedUsers(sqlite);
});

test('upload stores jpeg and exposes avatarAt on the user payload', async () => {
  const bytes = jpeg(1024);
  const { avatarAt } = await users.setAvatar('u1', bytes);
  assert.ok(avatarAt && !Number.isNaN(Date.parse(avatarAt.split('#')[0])));
  assert.match(avatarAt!, /#.{8}$/); // unique revision suffix
  const row = sqlite.prepare('SELECT avatar_at FROM users WHERE id = ?').get('u1') as { avatar_at: string };
  assert.equal(row.avatar_at, avatarAt);
  const found = await users.getAvatar('alice');
  assert.ok(found);
  assert.equal(found!.mime, 'image/jpeg');
  assert.deepEqual([...found!.data], [...bytes]);
});

test('png magic bytes accepted; other content rejected', async () => {
  const ok = await users.setAvatar('u1', png(64));
  assert.ok(ok.avatarAt);
  await assert.rejects(() => users.setAvatar('u1', new Uint8Array([0x47, 0x49, 0x46, 0x38])), /JPEG or PNG/); // gif
  await assert.rejects(() => users.setAvatar('u1', new TextEncoder().encode('hello world')), /JPEG or PNG/);
  await assert.rejects(() => users.setAvatar('u1', new Uint8Array(0)), /No image data/);
});

test('oversize upload rejected with 413', async () => {
  await assert.rejects(
    () => users.setAvatar('u1', jpeg(400 * 1024 + 1)),
    (e: any) => e?.status === 413 || /400 KB/.test(String(e?.message)),
  );
});

test('replace keeps version keys consistent and serves the new bytes', async () => {
  const first = await users.setAvatar('u1', jpeg(100));
  // Ensure a distinct timestamp even on fast machines.
  await new Promise((r) => setTimeout(r, 2));
  const secondBytes = jpeg(200);
  secondBytes[10] = 0xab;
  const second = await users.setAvatar('u1', secondBytes);
  assert.notEqual(second.avatarAt, first.avatarAt);
  // users.avatar_at, user_avatars.updated_at and the returned value all agree.
  const u = sqlite.prepare('SELECT avatar_at FROM users WHERE id = ?').get('u1') as { avatar_at: string };
  const a = sqlite.prepare('SELECT updated_at, data FROM user_avatars WHERE user_id = ?').get('u1') as { updated_at: string; data: Uint8Array };
  assert.equal(u.avatar_at, second.avatarAt);
  assert.equal(a.updated_at, second.avatarAt);
  const found = await users.getAvatar('alice');
  assert.deepEqual([...found!.data], [...secondBytes]);
});

test('ownership: one user cannot see or overwrite another user\'s avatar', async () => {
  await users.setAvatar('u1', jpeg(100));
  assert.equal(await users.getAvatar('bob'), null);
  await users.setAvatar('u2', png(150));
  const alice = await users.getAvatar('alice');
  const bob = await users.getAvatar('bob');
  assert.equal(alice!.mime, 'image/jpeg');
  assert.equal(bob!.mime, 'image/png');
});

test('remove deletes bytes and clears the version marker', async () => {
  await users.setAvatar('u1', jpeg(100));
  await users.removeAvatar('u1');
  assert.equal(await users.getAvatar('alice'), null);
  const u = sqlite.prepare('SELECT avatar_at FROM users WHERE id = ?').get('u1') as { avatar_at: string | null };
  assert.equal(u.avatar_at, null);
});

test('account deletion purges the avatar row', async () => {
  await users.setAvatar('u1', jpeg(100));
  await users.deleteMe('u1');
  assert.equal(await users.getAvatar('alice'), null);
  const n = (sqlite.prepare('SELECT COUNT(*) AS n FROM user_avatars').get() as { n: number }).n;
  assert.equal(n, 0);
});

test('concurrent same-millisecond replaces still get unique revisions', async () => {
  const RealDate = Date;
  const fixed = RealDate.parse('2026-11-22T12:00:00.000Z');
  // Freeze the clock so both writes happen at the identical millisecond.
  // @ts-ignore deliberate test stub
  globalThis.Date = class extends RealDate {
    constructor() { super(fixed); }
    static now() { return fixed; }
  };
  try {
    const a = await users.setAvatar('u1', jpeg(100));
    const b = await users.setAvatar('u1', jpeg(101));
    assert.notEqual(a.avatarAt, b.avatarAt);
    // Both carry the frozen ISO time; uniqueness comes from the suffix.
    assert.ok(a.avatarAt!.startsWith('2026-11-22T12:00:00.000Z'));
    assert.ok(b.avatarAt!.startsWith('2026-11-22T12:00:00.000Z'));
    const u = sqlite.prepare('SELECT avatar_at FROM users WHERE id = ?').get('u1') as { avatar_at: string };
    assert.equal(u.avatar_at, b.avatarAt);
  } finally {
    globalThis.Date = RealDate;
  }
});

test('avatarAt flows into the public user payload; null means initial-avatar fallback', async () => {
  const before = await users.search('alice');
  assert.equal(before.users[0].avatarAt, null);
  await users.setAvatar('u1', jpeg(100));
  const after = await users.search('alice');
  assert.ok(after.users[0].avatarAt);
});

test('controller: 404 with no-store when no photo; 200 with short cache; 304 on matching ETag', async () => {
  const controller = new UsersController(users);
  const makeRes = () => {
    const headers: Record<string, string> = {};
    return {
      headers,
      set(h: any, v?: string) { if (typeof h === 'string') headers[h] = v!; else Object.assign(headers, h); return this; },
      status(code: number) { this.statusCode = code; return this; },
      end() { this.ended = true; return this; },
      send(body: any) { this.body = body; return this; },
      statusCode: 200, ended: false, body: null as any,
    };
  };
  // No photo -> 404 and no-store
  const res404 = makeRes();
  await assert.rejects(() => controller.avatar('alice', { headers: {} } as any, res404 as any), /No profile photo/);
  assert.equal(res404.headers['Cache-Control'], 'no-store');

  await users.setAvatar('u1', jpeg(100));
  const res200 = makeRes();
  await controller.avatar('alice', { headers: {} } as any, res200 as any);
  assert.equal(res200.statusCode, 200);
  assert.equal(res200.headers['Cache-Control'], 'public, max-age=300, must-revalidate');
  assert.equal(res200.headers['Content-Type'], 'image/jpeg');
  assert.ok(res200.headers['ETag']);
  assert.ok(Buffer.isBuffer(res200.body));

  const res304 = makeRes();
  await controller.avatar('alice', { headers: { 'if-none-match': res200.headers['ETag'] } } as any, res304 as any);
  assert.equal(res304.statusCode, 304);
  assert.equal(res304.ended, true);
  assert.equal(res304.body, null);
});

test('auth guard rejects requests without a valid bearer token', async () => {
  setEnv({ JWT_SECRET: 'test-secret' } as any);
  const guard = new AuthGuard();
  const ctx = (headers: Record<string, string | undefined>) => ({
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  });
  await assert.rejects(() => guard.canActivate(ctx({}) as any), /bearer token/i);
  await assert.rejects(() => guard.canActivate(ctx({ authorization: 'Bearer garbage' }) as any), /bearer token/i);
});
