import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database.service';
import { randomId } from '../../common/crypto';
import {
  optionalInt,
  optionalRating,
  optionalString,
  requireMediaType,
  requireStatus,
  requireString,
  requireTmdbId,
} from '../../common/validate';

export interface LibraryItemInput {
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string | null;
  status: 'want' | 'watching' | 'watched';
  rating?: number | null;
  episodesWatched?: number | null;
  totalEpisodes?: number | null;
}

const SELECT_ITEM = `SELECT id, media_type, tmdb_id, title, poster_path, backdrop_path, release_date,
       status, rating, episodes_watched, total_episodes, added_at, updated_at FROM library_items`;

@Injectable()
export class LibraryService {
  constructor(private readonly db: DatabaseService) {}

  async list(userId: string, status?: string, mediaType?: string) {
    const clauses = ['user_id = ?'];
    const params: unknown[] = [userId];
    if (status) {
      clauses.push('status = ?');
      params.push(requireStatus(status));
    }
    if (mediaType) {
      clauses.push('media_type = ?');
      params.push(requireMediaType(mediaType));
    }
    const items = await this.db.all(
      `${SELECT_ITEM} WHERE ${clauses.join(' AND ')} ORDER BY updated_at DESC LIMIT 1000`,
      params,
    );
    return { items };
  }

  /** Batch lookup used by search/details to decorate TMDB results with the user's state. */
  async lookup(userId: string, refs: unknown) {
    if (!Array.isArray(refs) || refs.length === 0 || refs.length > 100) {
      throw new BadRequestException('refs must be an array of 1-100 items');
    }
    const out: Record<string, unknown> = {};
    for (const ref of refs) {
      const r = ref as Record<string, unknown>;
      const mediaType = requireMediaType(r.mediaType);
      const tmdbId = requireTmdbId(r.tmdbId);
      const item = await this.db.first(
        `${SELECT_ITEM} WHERE user_id = ? AND media_type = ? AND tmdb_id = ?`,
        [userId, mediaType, tmdbId],
      );
      out[`${mediaType}:${tmdbId}`] = item ?? null;
    }
    return { states: out };
  }

  async upsert(userId: string, mediaTypeRaw: unknown, tmdbIdRaw: unknown, body: Record<string, unknown>) {
    const mediaType = requireMediaType(mediaTypeRaw);
    const tmdbId = requireTmdbId(tmdbIdRaw);
    const title = requireString(body.title, 'title', 300);
    const status = requireStatus(body.status);
    const rating = optionalRating(body.rating);
    const episodesWatched = optionalInt(body.episodesWatched, 'episodesWatched', 0, 100000) ?? 0;
    const totalEpisodes = optionalInt(body.totalEpisodes, 'totalEpisodes', 0, 100000) ?? 0;
    if (episodesWatched > totalEpisodes && totalEpisodes > 0) {
      throw new BadRequestException('episodesWatched cannot exceed totalEpisodes');
    }
    const posterPath = optionalString(body.posterPath, 'posterPath', 200);
    const backdropPath = optionalString(body.backdropPath, 'backdropPath', 200);
    const releaseDate = optionalString(body.releaseDate, 'releaseDate', 20);

    await this.db.run(
      `INSERT INTO library_items
         (id, user_id, media_type, tmdb_id, title, poster_path, backdrop_path, release_date,
          status, rating, episodes_watched, total_episodes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, media_type, tmdb_id) DO UPDATE SET
         title = excluded.title,
         poster_path = COALESCE(excluded.poster_path, library_items.poster_path),
         backdrop_path = COALESCE(excluded.backdrop_path, library_items.backdrop_path),
         release_date = COALESCE(excluded.release_date, library_items.release_date),
         status = excluded.status,
         rating = COALESCE(excluded.rating, library_items.rating),
         episodes_watched = excluded.episodes_watched,
         total_episodes = excluded.total_episodes,
         updated_at = datetime('now')`,
      [randomId(), userId, mediaType, tmdbId, title, posterPath, backdropPath, releaseDate,
       status, rating, episodesWatched, totalEpisodes],
    );
    return this.getOne(userId, mediaType, tmdbId);
  }

  async patch(userId: string, mediaTypeRaw: unknown, tmdbIdRaw: unknown, body: Record<string, unknown>) {
    const mediaType = requireMediaType(mediaTypeRaw);
    const tmdbId = requireTmdbId(tmdbIdRaw);
    const existing = await this.getOne(userId, mediaType, tmdbId);
    if (!existing) throw new BadRequestException('Item not in library');

    const updates: string[] = [];
    const params: unknown[] = [];
    if (body.status !== undefined) {
      updates.push('status = ?');
      params.push(requireStatus(body.status));
    }
    if (body.rating !== undefined) {
      updates.push('rating = ?');
      params.push(optionalRating(body.rating));
    }
    if (body.episodesWatched !== undefined || body.totalEpisodes !== undefined) {
      const ew = optionalInt(body.episodesWatched, 'episodesWatched', 0, 100000) ?? Number((existing as Record<string, unknown>).episodes_watched);
      const te = optionalInt(body.totalEpisodes, 'totalEpisodes', 0, 100000) ?? Number((existing as Record<string, unknown>).total_episodes);
      if (ew > te && te > 0) throw new BadRequestException('episodesWatched cannot exceed totalEpisodes');
      updates.push('episodes_watched = ?', 'total_episodes = ?');
      params.push(ew, te);
    }
    if (updates.length === 0) throw new BadRequestException('Nothing to update');
    updates.push("updated_at = datetime('now')");
    params.push(userId, mediaType, tmdbId);
    await this.db.run(
      `UPDATE library_items SET ${updates.join(', ')} WHERE user_id = ? AND media_type = ? AND tmdb_id = ?`,
      params,
    );
    return this.getOne(userId, mediaType, tmdbId);
  }

  /**
   * Removes the item plus its dependent user data for the title (confirmed
   * product behavior 21 Nov): movie removes drop the whole-title review so a
   * re-add starts fresh; series removes drop episode progress and ALL season
   * reviews/ratings ("Remove from my Series" is a full reset).
   */
  async remove(userId: string, mediaTypeRaw: unknown, tmdbIdRaw: unknown) {
    const mediaType = requireMediaType(mediaTypeRaw);
    const tmdbId = requireTmdbId(tmdbIdRaw);
    await this.db.run('DELETE FROM library_items WHERE user_id = ? AND media_type = ? AND tmdb_id = ?', [
      userId, mediaType, tmdbId,
    ]);
    if (mediaType === 'tv') {
      await this.db.run('DELETE FROM episode_progress WHERE user_id = ? AND tmdb_id = ?', [userId, tmdbId]);
    }
    await this.db.run('DELETE FROM reviews WHERE user_id = ? AND media_type = ? AND tmdb_id = ?', [
      userId, mediaType, tmdbId,
    ]);
    return { removed: true };
  }

  private async getOne(userId: string, mediaType: string, tmdbId: number) {
    return this.db.first(`${SELECT_ITEM} WHERE user_id = ? AND media_type = ? AND tmdb_id = ?`, [
      userId, mediaType, tmdbId,
    ]);
  }

  // ---- Per-episode progress (TV) ----

  async getEpisodeProgress(userId: string, tmdbIdRaw: unknown) {
    const tmdbId = requireTmdbId(tmdbIdRaw);
    const rows = await this.db.all<{ season: number; episode: number }>(
      'SELECT season, episode FROM episode_progress WHERE user_id = ? AND tmdb_id = ? ORDER BY season, episode',
      [userId, tmdbId],
    );
    return { watched: rows };
  }

  /** Optional title metadata so a first episode mark can create the library item. */
  private episodeMeta(body: Record<string, unknown>) {
    return {
      title: optionalString(body.title, 'title', 300),
      posterPath: optionalString(body.posterPath, 'posterPath', 200),
      backdropPath: optionalString(body.backdropPath, 'backdropPath', 200),
      releaseDate: optionalString(body.releaseDate, 'releaseDate', 20),
      totalEpisodes: optionalInt(body.totalEpisodes, 'totalEpisodes', 0, 100000),
    };
  }

  private async ensureTvItem(userId: string, tmdbId: number, body: Record<string, unknown>) {
    const existing = await this.getOne(userId, 'tv', tmdbId);
    if (existing) return;
    const meta = this.episodeMeta(body);
    if (!meta.title) throw new BadRequestException('Item not in library; title is required to start tracking');
    await this.upsert(userId, 'tv', tmdbId, {
      title: meta.title,
      posterPath: meta.posterPath,
      backdropPath: meta.backdropPath,
      releaseDate: meta.releaseDate,
      status: 'watching',
      episodesWatched: 0,
      totalEpisodes: meta.totalEpisodes ?? 0,
    });
  }

  private async syncEpisodeCount(userId: string, tmdbId: number) {
    const row = await this.db.first<{ c: number }>(
      'SELECT COUNT(*) AS c FROM episode_progress WHERE user_id = ? AND tmdb_id = ?',
      [userId, tmdbId],
    );
    const count = Number(row?.c ?? 0);
    const item = (await this.getOne(userId, 'tv', tmdbId)) as Record<string, unknown> | undefined;
    if (item) {
      const total = Number(item.total_episodes ?? 0);
      await this.db.run(
        "UPDATE library_items SET episodes_watched = ?, updated_at = datetime('now') WHERE user_id = ? AND media_type = 'tv' AND tmdb_id = ?",
        [total > 0 ? Math.min(count, total) : count, userId, tmdbId],
      );
    }
    return count;
  }

  async setEpisodeWatched(userId: string, tmdbIdRaw: unknown, body: Record<string, unknown>) {
    const tmdbId = requireTmdbId(tmdbIdRaw);
    const season = optionalInt(body.season, 'season', 0, 1000);
    const episode = optionalInt(body.episode, 'episode', 0, 100000);
    if (season === null || episode === null) throw new BadRequestException('season and episode are required');
    const watched = body.watched !== false; // default true; pass false to unmark
    if (watched) await this.ensureTvItem(userId, tmdbId, body);
    if (watched) {
      await this.db.run(
        'INSERT OR IGNORE INTO episode_progress (id, user_id, tmdb_id, season, episode) VALUES (?, ?, ?, ?, ?)',
        [randomId(), userId, tmdbId, season, episode],
      );
    } else {
      await this.db.run(
        'DELETE FROM episode_progress WHERE user_id = ? AND tmdb_id = ? AND season = ? AND episode = ?',
        [userId, tmdbId, season, episode],
      );
    }
    const episodesWatched = await this.syncEpisodeCount(userId, tmdbId);
    return { watched, season, episode, episodesWatched };
  }

  /** Mark a whole season watched (episodes = the season's episode numbers) or unwatched. */
  async setSeasonWatched(userId: string, tmdbIdRaw: unknown, seasonRaw: unknown, body: Record<string, unknown>) {
    const tmdbId = requireTmdbId(tmdbIdRaw);
    const season = optionalInt(seasonRaw, 'season', 0, 1000);
    if (season === null) throw new BadRequestException('invalid season');
    const watched = body.watched !== false;
    if (watched) {
      if (!Array.isArray(body.episodes) || body.episodes.length === 0 || body.episodes.length > 2000) {
        throw new BadRequestException('episodes must be an array of 1-2000 episode numbers');
      }
      await this.ensureTvItem(userId, tmdbId, body);
      for (const raw of (body.episodes as unknown[]).slice(0, 2000)) {
        const ep = optionalInt(raw, 'episode', 0, 100000);
        if (ep === null) throw new BadRequestException('episodes must be integers');
        await this.db.run(
          'INSERT OR IGNORE INTO episode_progress (id, user_id, tmdb_id, season, episode) VALUES (?, ?, ?, ?, ?)',
          [randomId(), userId, tmdbId, season, ep],
        );
      }
    } else {
      await this.db.run(
        'DELETE FROM episode_progress WHERE user_id = ? AND tmdb_id = ? AND season = ?',
        [userId, tmdbId, season],
      );
    }
    const episodesWatched = await this.syncEpisodeCount(userId, tmdbId);
    return { watched, season, episodesWatched };
  }

  /**
   * Move to Want = fresh start (user-confirmed 21 Nov): status becomes
   * 'want', rating cleared, reviews (all seasons + whole title) and episode
   * progress deleted.
   */
  async moveToWant(userId: string, mediaTypeRaw: unknown, tmdbIdRaw: unknown) {
    const mediaType = requireMediaType(mediaTypeRaw);
    const tmdbId = requireTmdbId(tmdbIdRaw);
    const existing = await this.getOne(userId, mediaType, tmdbId);
    if (!existing) throw new BadRequestException('Item not in library');
    await this.db.run(
      "UPDATE library_items SET status = 'want', rating = NULL, episodes_watched = 0, updated_at = datetime('now') WHERE user_id = ? AND media_type = ? AND tmdb_id = ?",
      [userId, mediaType, tmdbId],
    );
    if (mediaType === 'tv') {
      await this.db.run('DELETE FROM episode_progress WHERE user_id = ? AND tmdb_id = ?', [userId, tmdbId]);
    }
    await this.db.run('DELETE FROM reviews WHERE user_id = ? AND media_type = ? AND tmdb_id = ?', [
      userId, mediaType, tmdbId,
    ]);
    return this.getOne(userId, mediaType, tmdbId);
  }

  // ---- Aggregate counts for the title page stats row (no private data) ----

  async titleStats(mediaTypeRaw: unknown, tmdbIdRaw: unknown) {
    const mediaType = requireMediaType(mediaTypeRaw);
    const tmdbId = requireTmdbId(tmdbIdRaw);
    const rows = await this.db.all<{ status: string; c: number }>(
      'SELECT status, COUNT(*) AS c FROM library_items WHERE media_type = ? AND tmdb_id = ? GROUP BY status',
      [mediaType, tmdbId],
    );
    const reviews = await this.db.first<{ c: number }>(
      'SELECT COUNT(*) AS c FROM reviews WHERE media_type = ? AND tmdb_id = ?',
      [mediaType, tmdbId],
    );
    const by: Record<string, number> = {};
    for (const r of rows) by[r.status] = Number(r.c);
    return {
      want: by.want ?? 0,
      watching: by.watching ?? 0,
      watched: by.watched ?? 0,
      reviews: Number(reviews?.c ?? 0),
    };
  }

  // ---- Export ----

  async exportVelora(userId: string) {
    const items = await this.db.all(
      `${SELECT_ITEM} WHERE user_id = ? ORDER BY added_at ASC`,
      [userId],
    );
    const reviews = await this.db.all(
      `SELECT media_type, tmdb_id, season_number, rating, body, created_at FROM reviews WHERE user_id = ?`,
      [userId],
    );
    return {
      format: 'velora-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      items,
      reviews,
    };
  }

  /** SIMKL-compatible CSV: matches the columns SIMKL's own backup/importer understands. */
  async exportSimklCsv(userId: string) {
    const items = await this.db.all<Record<string, unknown>>(
      `${SELECT_ITEM} WHERE user_id = ? ORDER BY added_at ASC`,
      [userId],
    );
    const statusMap: Record<string, string> = { want: 'plantowatch', watching: 'watching', watched: 'completed' };
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = 'Type,Title,Status,Rating,WatchedDate,EpisodesWatched,TotalEpisodes,TmdbId';
    const lines = items.map((i) =>
      [
        i.media_type === 'tv' ? 'show' : 'movie',
        esc(i.title),
        statusMap[String(i.status)] ?? i.status,
        i.rating ?? '',
        i.status === 'watched' ? i.updated_at : '',
        i.media_type === 'tv' ? i.episodes_watched : '',
        i.media_type === 'tv' ? i.total_episodes : '',
        i.tmdb_id,
      ].join(','),
    );
    return { filename: 'velora-simkl-export.csv', contentType: 'text/csv', csv: [header, ...lines].join('\n') };
  }

  // ---- Import ----

  async importVelora(userId: string, payload: unknown) {
    const p = payload as { items?: unknown[]; reviews?: unknown[] };
    if (!p || !Array.isArray(p.items)) throw new BadRequestException('Expected a Velora export object with an items array');
    let imported = 0;
    for (const raw of p.items.slice(0, 5000)) {
      try {
        const i = raw as Record<string, unknown>;
        await this.upsert(userId, i.media_type ?? i.mediaType, i.tmdb_id ?? i.tmdbId, {
          title: i.title,
          posterPath: i.poster_path ?? i.posterPath ?? null,
          backdropPath: i.backdrop_path ?? i.backdropPath ?? null,
          releaseDate: i.release_date ?? i.releaseDate ?? null,
          status: i.status,
          rating: i.rating ?? null,
          episodesWatched: i.episodes_watched ?? i.episodesWatched ?? 0,
          totalEpisodes: i.total_episodes ?? i.totalEpisodes ?? 0,
        });
        imported++;
      } catch {
        // Skip malformed rows; report the count honestly.
      }
    }
    return { imported, skipped: Math.min(p.items.length, 5000) - imported };
  }

  /**
   * SIMKL backup JSON (from SIMKL's API / ZIP backup) shape:
   * { movies: [{title, year, ids:{tmdb|imdb}, user_rating?, status?}], shows: [{...last_watched, watched_episodes_count}] }
   * and SIMKL CSV backup columns: Simkl ID, Title, Watchlist Status, WatchedDate, ...
   * Rows without a TMDB id are returned as unresolved for the app to match against TMDB search.
   */
  async importSimkl(userId: string, payload: unknown) {
    const p = payload as Record<string, unknown>;
    const collected: LibraryItemInput[] = [];
    const unresolved: { title: string; type: string }[] = [];

    const statusMap: Record<string, LibraryItemInput['status']> = {
      plantowatch: 'want',
      'plan to watch': 'want',
      watching: 'watching',
      completed: 'watched',
      watched: 'watched',
      hold: 'watching',
      dropped: 'watched',
    };

    const takeMovie = (m: Record<string, unknown>) => {
      const ids = (m.ids ?? {}) as Record<string, unknown>;
      const tmdb = Number(ids.tmdb ?? ids.tmdbid ?? m.tmdb_id ?? m.tmdbId ?? 0);
      const title = String(m.title ?? m.Title ?? '');
      if (!title) return;
      if (!tmdb) {
        unresolved.push({ title, type: 'movie' });
        return;
      }
      collected.push({
        mediaType: 'movie',
        tmdbId: tmdb,
        title,
        status: statusMap[String(m.status ?? m['Watchlist Status'] ?? m.list ?? 'completed').toLowerCase()] ?? 'watched',
        rating: optionalRating(m.user_rating ?? m.rating ?? m.Rating) ?? null,
        releaseDate: m.year ? `${m.year}-01-01` : null,
      });
    };

    const takeShow = (s: Record<string, unknown>) => {
      const ids = (s.ids ?? {}) as Record<string, unknown>;
      const tmdb = Number(ids.tmdb ?? ids.tvdb_tmdb ?? s.tmdb_id ?? s.tmdbId ?? 0);
      const title = String(s.title ?? s.Title ?? '');
      if (!title) return;
      if (!tmdb) {
        unresolved.push({ title, type: 'show' });
        return;
      }
      const show = (s.show ?? {}) as Record<string, unknown>;
      collected.push({
        mediaType: 'tv',
        tmdbId: tmdb,
        title: title || String(show.title ?? ''),
        status: statusMap[String(s.status ?? s['Watchlist Status'] ?? 'completed').toLowerCase()] ?? 'watched',
        rating: optionalRating(s.user_rating ?? s.rating ?? s.Rating) ?? null,
        episodesWatched: Number(s.watched_episodes_count ?? s.EpisodesWatched ?? 0) || 0,
        totalEpisodes: Number(show.aired_episodes_count ?? s.TotalEpisodes ?? s.total_episodes ?? 0) || 0,
      });
    };

    if (Array.isArray(p.movies)) p.movies.forEach((m) => takeMovie(m as Record<string, unknown>));
    if (Array.isArray(p.shows)) p.shows.forEach((s) => takeShow(s as Record<string, unknown>));

    // SIMKL simple CSV backup rows (already parsed to objects by the caller).
    if (Array.isArray(p.csvRows)) {
      for (const row of p.csvRows as Record<string, unknown>[]) {
        const type = String(row.Type ?? row.type ?? 'movie').toLowerCase();
        if (type === 'movie') takeMovie(row);
        else takeShow(row);
      }
    }

    if (collected.length === 0 && unresolved.length === 0) {
      throw new BadRequestException('No SIMKL movies/shows found in this file');
    }

    let imported = 0;
    for (const item of collected.slice(0, 5000)) {
      try {
        await this.upsert(userId, item.mediaType, item.tmdbId, item as unknown as Record<string, unknown>);
        imported++;
      } catch {
        // skip
      }
    }
    return { imported, unresolved };
  }

  /**
   * Merge-only import of a Must profile that the app already matched to TMDB.
   * Never overwrites: an existing title keeps its status, rating and review. Missing episode rows,
   * season ratings and reviews are added with INSERT OR IGNORE, so re-running is safe.
   * Original add/watch dates are unknown in Must, so rows get the import time and the source's
   * last-modified time is kept only in import_sources.
   */
  async importMust(userId: string, payload: unknown) {
    const p = payload as { items?: unknown[] };
    if (!p || !Array.isArray(p.items) || p.items.length === 0 || p.items.length > 40) {
      throw new BadRequestException('items must be an array of 1-40 matched titles');
    }
    const results: { mustId: string; outcome: 'created' | 'existing_kept' | 'failed'; episodesAdded: number; error?: string }[] = [];
    let episodeBudget = 4000;
    for (const raw of p.items) {
      const i = raw as Record<string, unknown>;
      const mustId = String(i.mustId ?? '');
      try {
        const mediaType = requireMediaType(i.mediaType);
        const tmdbId = requireTmdbId(i.tmdbId);
        if (!mustId) throw new BadRequestException('mustId is required');
        const existing = await this.getOne(userId, mediaType, tmdbId);
        let outcome: 'created' | 'existing_kept' = 'existing_kept';
        let addedAt: string | null = null;
        if (!existing) {
          const status = requireStatus(i.status);
          const total = optionalInt(i.totalEpisodes, 'totalEpisodes', 0, 100000) ?? 0;
          // Must exposes no original add date. Per the user's decision, its last-modified time is used as
          // added_at when valid (not in the future); the import_sources row flags it as a fallback date.
          const ms = Date.parse(String(i.sourceModifiedAt ?? ''));
          if (Number.isFinite(ms) && ms <= Date.now() && ms > Date.parse('2000-01-01')) {
            addedAt = new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
          }
          await this.db.run(
            `INSERT OR IGNORE INTO library_items
               (id, user_id, media_type, tmdb_id, title, poster_path, backdrop_path, release_date,
                status, rating, episodes_watched, total_episodes, added_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, COALESCE(?, datetime('now')))`,
            [randomId(), userId, mediaType, tmdbId, requireString(i.title, 'title', 300),
             optionalString(i.posterPath, 'posterPath', 200), optionalString(i.backdropPath, 'backdropPath', 200),
             optionalString(i.releaseDate, 'releaseDate', 20), status, optionalRating(i.rating), total, addedAt],
          );
          outcome = 'created';
        }
        await this.db.run(
          `INSERT OR IGNORE INTO import_sources (id, user_id, source, source_id, media_type, tmdb_id, source_modified_at, added_at_is_fallback)
           VALUES (?, ?, 'must', ?, ?, ?, ?, ?)`,
          [randomId(), userId, mustId, mediaType, tmdbId, optionalString(i.sourceModifiedAt, 'sourceModifiedAt', 40), addedAt ? 1 : 0],
        );
        // Title review (only when the title was created now: an existing review is never replaced).
        const review = i.review as Record<string, unknown> | null | undefined;
        if (outcome === 'created' && review && typeof review.body === 'string' && review.body.trim()) {
          await this.db.run(
            `INSERT OR IGNORE INTO reviews (id, user_id, media_type, tmdb_id, season_number, rating, body)
             VALUES (?, ?, ?, ?, 0, ?, ?)`,
            [randomId(), userId, mediaType, tmdbId, optionalRating(i.rating), optionalString(review.body, 'review', 4000)],
          );
        }
        let episodesAdded = 0;
        if (mediaType === 'tv') {
          for (const sraw of Array.isArray(i.seasons) ? (i.seasons as unknown[]).slice(0, 100) : []) {
            const s = sraw as Record<string, unknown>;
            const season = optionalInt(s.season, 'season', 0, 1000);
            if (season === null) continue;
            const sRating = optionalRating(s.rating);
            const sBody = typeof s.review === 'string' ? s.review.slice(0, 4000) : '';
            if (season >= 1 && (sRating !== null || sBody)) {
              await this.db.run(
                `INSERT OR IGNORE INTO reviews (id, user_id, media_type, tmdb_id, season_number, rating, body)
                 VALUES (?, ?, 'tv', ?, ?, ?, ?)`,
                [randomId(), userId, tmdbId, season, sRating, sBody],
              );
            }
            for (const eraw of Array.isArray(s.watchedEpisodes) ? (s.watchedEpisodes as unknown[]) : []) {
              if (episodeBudget-- <= 0) throw new BadRequestException('too many episodes in one request');
              const ep = optionalInt(eraw, 'episode', 1, 100000);
              if (ep === null) continue;
              const r = await this.db.run(
                'INSERT OR IGNORE INTO episode_progress (id, user_id, tmdb_id, season, episode) VALUES (?, ?, ?, ?, ?)',
                [randomId(), userId, tmdbId, season, ep],
              );
              if ((r.meta?.changes ?? 0) > 0) episodesAdded++;
            }
          }
          if (episodesAdded > 0) await this.syncEpisodeCount(userId, tmdbId);
        }
        results.push({ mustId, outcome, episodesAdded });
      } catch (e) {
        results.push({ mustId, outcome: 'failed', episodesAdded: 0, error: e instanceof Error ? e.message.slice(0, 160) : 'failed' });
      }
    }
    return { results };
  }
}
