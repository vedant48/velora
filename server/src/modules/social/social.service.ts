import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database.service';
import { randomId } from '../../common/crypto';

@Injectable()
export class SocialService {
  constructor(private readonly db: DatabaseService) {}

  async follow(userId: string, usernameRaw: string) {
    const target = await this.db.first<{ id: string }>(
      'SELECT id FROM users WHERE username = ?',
      [usernameRaw.trim().toLowerCase()],
    );
    if (!target) throw new NotFoundException('User not found');
    if (target.id === userId) throw new BadRequestException('You cannot follow yourself');
    await this.db.run(
      'INSERT OR IGNORE INTO follows (id, follower_id, followee_id) VALUES (?, ?, ?)',
      [randomId(), userId, target.id],
    );
    return { following: true };
  }

  async unfollow(userId: string, usernameRaw: string) {
    const target = await this.db.first<{ id: string }>(
      'SELECT id FROM users WHERE username = ?',
      [usernameRaw.trim().toLowerCase()],
    );
    if (!target) throw new NotFoundException('User not found');
    await this.db.run('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?', [userId, target.id]);
    return { following: false };
  }

  /**
   * Match % between two users, Must-style: titles both have rated, scored by
   * rating agreement. Needs at least 3 shared rated titles, else null.
   */
  async match(userId: string, usernameRaw: string) {
    const target = await this.db.first<{ id: string; username: string; display_name: string; is_private: number }>(
      'SELECT id, username, display_name, is_private FROM users WHERE username = ?',
      [usernameRaw.trim().toLowerCase()],
    );
    if (!target) throw new NotFoundException('User not found');
    if (target.is_private === 1 && target.id !== userId) {
      throw new ForbiddenException('This account is private');
    }
    const shared = await this.db.all<{ title: string; mine: number; theirs: number; media_type: string; tmdb_id: number }>(
      `SELECT a.title, a.rating AS mine, b.rating AS theirs, a.media_type, a.tmdb_id
       FROM library_items a
       JOIN library_items b ON b.media_type = a.media_type AND b.tmdb_id = a.tmdb_id
       WHERE a.user_id = ? AND b.user_id = ? AND a.rating IS NOT NULL AND b.rating IS NOT NULL`,
      [userId, target.id],
    );
    if (shared.length < 3) {
      return {
        percent: null,
        sharedRated: shared.length,
        message: 'Rate at least 3 of the same titles to unlock Match %',
      };
    }
    const avgDiff = shared.reduce((acc, s) => acc + Math.abs(s.mine - s.theirs), 0) / shared.length;
    const percent = Math.max(0, Math.round(100 - avgDiff * 10));
    return {
      percent,
      sharedRated: shared.length,
      with: { username: target.username, displayName: target.display_name },
      topAgreements: shared.filter((s) => Math.abs(s.mine - s.theirs) <= 1).slice(0, 10),
    };
  }

  /** Recent activity of the people the user follows. */
  async activity(userId: string) {
    const items = await this.db.all(
      `SELECT l.media_type, l.tmdb_id, l.title, l.poster_path, l.status, l.rating, l.updated_at,
              u.username, u.display_name, 'library' AS kind
       FROM library_items l
       JOIN follows f ON f.followee_id = l.user_id
       JOIN users u ON u.id = l.user_id
       WHERE f.follower_id = ? AND u.is_private = 0
       ORDER BY l.updated_at DESC LIMIT 50`,
      [userId],
    );
    const reviewEvents = await this.db.all(
      `SELECT r.media_type, r.tmdb_id, r.rating, r.body, r.season_number, r.updated_at,
              u.username, u.display_name, 'review' AS kind, '' AS title, NULL AS poster_path, NULL AS status
       FROM reviews r
       JOIN follows f ON f.followee_id = r.user_id
       JOIN users u ON u.id = r.user_id
       WHERE f.follower_id = ?
       ORDER BY r.updated_at DESC LIMIT 50`,
      [userId],
    );
    const feed = [...items, ...reviewEvents]
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
      .slice(0, 50);
    return { feed };
  }
}
