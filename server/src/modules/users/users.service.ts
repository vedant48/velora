import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
    await this.db.run('DELETE FROM users WHERE id = ?', [userId]);
    return { deleted: true };
  }

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
