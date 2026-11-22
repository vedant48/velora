import { BadRequestException, ForbiddenException, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { DatabaseService } from '../../common/database.service';
import { PublicUser, toPublicUser } from '../auth/auth.service';
import { optionalString, requireString } from '../../common/validate';

export interface UserStats {
  watched: number;
  want: number;
  watching: number;
  series: number;
  reviews: number;
  followers: number;
  following: number;
  rank: number;
}

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async stats(userId: string): Promise<UserStats> {
    const counts = await this.db.all<{ status: string; media_type: string; n: number }>(
      'SELECT status, media_type, COUNT(*) AS n FROM library_items WHERE user_id = ? GROUP BY status, media_type',
      [userId],
    );
    let watched = 0, want = 0, watching = 0, series = 0;
    for (const c of counts) {
      if (c.status === 'watched') watched += c.n;
      if (c.status === 'want') want += c.n;
      if (c.status === 'watching') watching += c.n;
      if (c.media_type === 'tv' && c.status !== 'want') series += c.n;
    }
    const rev = await this.db.first<{ n: number }>('SELECT COUNT(*) AS n FROM reviews WHERE user_id = ?', [userId]);
    const f1 = await this.db.first<{ n: number }>('SELECT COUNT(*) AS n FROM follows WHERE followee_id = ?', [userId]);
    const f2 = await this.db.first<{ n: number }>('SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?', [userId]);
    // Global rank by watched count (1 = most watched titles).
    const rankRow = await this.db.first<{ r: number }>(
      `SELECT 1 + COUNT(*) AS r FROM (
         SELECT user_id, COUNT(*) AS c FROM library_items WHERE status = 'watched' GROUP BY user_id
       ) WHERE c > (SELECT COUNT(*) FROM library_items WHERE status = 'watched' AND user_id = ?)`,
      [userId],
    );
    return {
      watched,
      want,
      watching,
      series,
      reviews: rev?.n ?? 0,
      followers: f1?.n ?? 0,
      following: f2?.n ?? 0,
      rank: rankRow?.r ?? 1,
    };
  }

  async publicProfile(usernameRaw: string, viewerId?: string) {
    const username = usernameRaw.trim().toLowerCase();
    const row = await this.db.first<Parameters<typeof toPublicUser>[0] & { is_private: number }>(
      'SELECT * FROM users WHERE username = ?',
      [username],
    );
    if (!row) throw new NotFoundException('User not found');
    let isFollowing = false;
    if (viewerId) {
      isFollowing = !!(await this.db.first('SELECT id FROM follows WHERE follower_id = ? AND followee_id = ?', [
        viewerId,
        row.id,
      ]));
    }
    const isPrivate = row.is_private === 1;
    const isSelf = viewerId === row.id;
    // Private accounts: profile basics stay discoverable, library and stats are hidden from others.
    const stats = isPrivate && !isSelf ? null : await this.stats(row.id);
    return { user: toPublicUser(row), stats, isFollowing, isPrivate };
  }

  async updateMe(userId: string, body: Record<string, unknown>) {
    const displayName = optionalString(body.displayName, 'displayName', 50);
    const bio = optionalString(body.bio, 'bio', 300);
    const isPrivate = typeof body.isPrivate === 'boolean' ? body.isPrivate : null;
    if (displayName === null && bio === null && isPrivate === null) throw new BadRequestException('Nothing to update');
    if (displayName !== null) await this.db.run('UPDATE users SET display_name = ? WHERE id = ?', [displayName, userId]);
    if (bio !== null) await this.db.run('UPDATE users SET bio = ? WHERE id = ?', [bio, userId]);
    if (isPrivate !== null) await this.db.run('UPDATE users SET is_private = ? WHERE id = ?', [isPrivate ? 1 : 0, userId]);
    const row = await this.db.first<Parameters<typeof toPublicUser>[0] & { is_private: number }>('SELECT * FROM users WHERE id = ?', [userId]);
    return { user: toPublicUser(row!), isPrivate: row!.is_private === 1 };
  }

  /** Permanently deletes the account and every row it owns. */
  async deleteMe(userId: string) {
    await this.db.run('DELETE FROM follows WHERE follower_id = ? OR followee_id = ?', [userId, userId]);
    await this.db.run('DELETE FROM reviews WHERE user_id = ?', [userId]);
    await this.db.run('DELETE FROM library_items WHERE user_id = ?', [userId]);
    await this.db.run('DELETE FROM simkl_connections WHERE user_id = ?', [userId]);
    await this.db.run('DELETE FROM user_avatars WHERE user_id = ?', [userId]);
    await this.db.run('DELETE FROM users WHERE id = ?', [userId]);
    return { deleted: true };
  }

  /**
   * Stores the caller's profile photo. Only JPEG/PNG up to MAX_AVATAR_BYTES
   * are accepted; magic bytes are checked because the server cannot
   * re-encode untrusted images on the free Worker runtime.
   */
  async setAvatar(userId: string, bytes: Uint8Array) {
    if (!bytes || bytes.length === 0) throw new BadRequestException('No image data received');
    if (bytes.length > UsersService.MAX_AVATAR_BYTES) {
      throw new PayloadTooLargeException('Image must be 400 KB or smaller after compression');
    }
    const mime = detectImageMime(bytes);
    if (!mime) throw new BadRequestException('Only JPEG or PNG images are supported');
    // Unique per write, even for concurrent same-millisecond uploads: ISO time + random suffix.
    const now = `${new Date().toISOString()}#${crypto.randomUUID().slice(0, 8)}`;
    await this.db.batch([
      {
        sql: 'INSERT INTO user_avatars (user_id, mime, data, updated_at) VALUES (?, ?, ?, ?) '
           + 'ON CONFLICT(user_id) DO UPDATE SET mime = excluded.mime, data = excluded.data, updated_at = excluded.updated_at',
        params: [userId, mime, bytes, now],
      },
      { sql: 'UPDATE users SET avatar_at = ? WHERE id = ?', params: [now, userId] },
    ]);
    return { avatarAt: now };
  }

  async removeAvatar(userId: string) {
    await this.db.batch([
      { sql: 'DELETE FROM user_avatars WHERE user_id = ?', params: [userId] },
      { sql: 'UPDATE users SET avatar_at = NULL WHERE id = ?', params: [userId] },
    ]);
    return { removed: true };
  }

  /** Photo bytes for a username, or null when the user has no photo. */
  async getAvatar(usernameRaw: string): Promise<{ mime: string; data: Uint8Array; updatedAt: string } | null> {
    const username = usernameRaw.trim().toLowerCase();
    const row = await this.db.first<{ mime: string; data: Uint8Array; updated_at: string }>(
      'SELECT a.mime, a.data, a.updated_at FROM user_avatars a JOIN users u ON u.id = a.user_id WHERE u.username = ?',
      [username],
    );
    if (!row) return null;
    return { mime: row.mime, data: row.data, updatedAt: row.updated_at };
  }

  private static readonly MAX_AVATAR_BYTES = 400 * 1024;

  async search(qRaw: unknown) {
    const q = requireString(qRaw, 'q', 50);
    const rows = await this.db.all<Parameters<typeof toPublicUser>[0]>(
      'SELECT * FROM users WHERE username LIKE ? OR display_name LIKE ? ORDER BY username LIMIT 20',
      [`%${q}%`, `%${q}%`],
    );
    const users: PublicUser[] = rows.map(toPublicUser);
    return { users };
  }

  /** Public library of a user, one status bucket at a time. Private accounts: owner only. */
  async publicLibrary(usernameRaw: string, statusRaw: unknown, viewerId?: string) {
    const username = usernameRaw.trim().toLowerCase();
    const row = await this.db.first<{ id: string; is_private: number }>('SELECT id, is_private FROM users WHERE username = ?', [username]);
    if (!row) throw new NotFoundException('User not found');
    if (row.is_private === 1 && viewerId !== row.id) {
      throw new ForbiddenException('This account is private');
    }
    const status = statusRaw === undefined ? null : String(statusRaw);
    const where = status ? 'AND status = ?' : '';
    const params: unknown[] = status ? [row.id, status] : [row.id];
    const items = await this.db.all(
      `SELECT media_type, tmdb_id, title, poster_path, release_date, status, rating,
              episodes_watched, total_episodes, added_at, updated_at
       FROM library_items WHERE user_id = ? ${where}
       ORDER BY updated_at DESC LIMIT 500`,
      params,
    );
    return { items };
  }
}

function detectImageMime(bytes: Uint8Array): 'image/jpeg' | 'image/png' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (
    bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  return null;
}
