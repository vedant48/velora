import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database.service';
import { randomId } from '../../common/crypto';
import { optionalInt, optionalRating, optionalString, requireMediaType, requireTmdbId } from '../../common/validate';

@Injectable()
export class ReviewsService {
  constructor(private readonly db: DatabaseService) {}

  /** Upsert a review (or rating-only) for a whole title (seasonNumber 0) or one season. */
  async upsert(userId: string, mediaTypeRaw: unknown, tmdbIdRaw: unknown, body: Record<string, unknown>) {
    const mediaType = requireMediaType(mediaTypeRaw);
    const tmdbId = requireTmdbId(tmdbIdRaw);
    const seasonNumber = optionalInt(body.seasonNumber, 'seasonNumber', 0, 1000) ?? 0;
    if (mediaType === 'movie' && seasonNumber !== 0) {
      throw new BadRequestException('Movies do not have seasons');
    }
    const text = optionalString(body.body, 'body', 4000) ?? '';
    const rating = optionalRating(body.rating);
    if (!text && rating === null) throw new BadRequestException('Review text or a rating is required');

    await this.db.run(
      `INSERT INTO reviews (id, user_id, media_type, tmdb_id, season_number, rating, body, rated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CASE WHEN ? IS NULL THEN NULL ELSE datetime('now') END)
       ON CONFLICT (user_id, media_type, tmdb_id, season_number) DO UPDATE SET
         rating = COALESCE(excluded.rating, reviews.rating),
         rated_at = CASE
           WHEN excluded.rating IS NOT NULL AND (reviews.rating IS NULL OR reviews.rating <> excluded.rating) THEN datetime('now')
           ELSE reviews.rated_at END,
         body = excluded.body,
         updated_at = datetime('now')`,
      [randomId(), userId, mediaType, tmdbId, seasonNumber, rating, text, rating],
    );
    return this.db.first(
      `SELECT r.*, u.username, u.display_name FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.user_id = ? AND r.media_type = ? AND r.tmdb_id = ? AND r.season_number = ?`,
      [userId, mediaType, tmdbId, seasonNumber],
    );
  }

  async listForTitle(mediaTypeRaw: unknown, tmdbIdRaw: unknown, seasonRaw?: string) {
    const mediaType = requireMediaType(mediaTypeRaw);
    const tmdbId = requireTmdbId(tmdbIdRaw);
    const season = seasonRaw === undefined ? null : optionalInt(seasonRaw, 'season', 0, 1000);
    const where = season === null ? '' : 'AND r.season_number = ?';
    const params: unknown[] = season === null ? [mediaType, tmdbId] : [mediaType, tmdbId, season];
    const reviews = await this.db.all(
      `SELECT r.id, r.user_id, r.media_type, r.tmdb_id, r.season_number, r.rating, r.body,
              r.created_at, r.updated_at, u.username, u.display_name
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.media_type = ? AND r.tmdb_id = ? ${where}
       ORDER BY r.updated_at DESC LIMIT 200`,
      params,
    );
    return { reviews };
  }

  /** Reviews of this title by the caller and the people the caller follows, with each author's photo marker. */
  async circle(userId: string, mediaTypeRaw: unknown, tmdbIdRaw: unknown) {
    const mediaType = requireMediaType(mediaTypeRaw);
    const tmdbId = requireTmdbId(tmdbIdRaw);
    const reviews = await this.db.all(
      `SELECT r.id, r.user_id, r.media_type, r.tmdb_id, r.season_number, r.rating, r.body,
              r.created_at, r.updated_at, r.rated_at, u.username, u.display_name, u.avatar_at
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.media_type = ? AND r.tmdb_id = ?
         AND (r.user_id = ? OR r.user_id IN (SELECT followee_id FROM follows WHERE follower_id = ?))
       ORDER BY r.updated_at DESC LIMIT 300`,
      [mediaType, tmdbId, userId, userId],
    );
    // Seasons each person has watched (any episode), for the per-person drawer. Private accounts other than the caller stay hidden.
    const watched =
      mediaType === 'tv'
        ? await this.db.all(
            `SELECT e.user_id, e.season AS season_number, COUNT(*) AS episodes
             FROM episode_progress e JOIN users u ON u.id = e.user_id
             WHERE e.tmdb_id = ? AND e.season > 0 AND (u.is_private = 0 OR e.user_id = ?)
               AND (e.user_id = ? OR e.user_id IN (SELECT followee_id FROM follows WHERE follower_id = ?))
             GROUP BY e.user_id, e.season`,
            [tmdbId, userId, userId, userId],
          )
        : [];
    return { reviews, watched };
  }

  async mine(userId: string) {
    const reviews = await this.db.all(
      `SELECT * FROM reviews WHERE user_id = ? ORDER BY updated_at DESC LIMIT 500`,
      [userId],
    );
    return { reviews };
  }

  async remove(userId: string, mediaTypeRaw: unknown, tmdbIdRaw: unknown, seasonRaw?: string) {
    const mediaType = requireMediaType(mediaTypeRaw);
    const tmdbId = requireTmdbId(tmdbIdRaw);
    const season = optionalInt(seasonRaw, 'season', 0, 1000) ?? 0;
    await this.db.run(
      'DELETE FROM reviews WHERE user_id = ? AND media_type = ? AND tmdb_id = ? AND season_number = ?',
      [userId, mediaType, tmdbId, season],
    );
    return { removed: true };
  }
}
