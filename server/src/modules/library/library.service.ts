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

  async remove(userId: string, mediaTypeRaw: unknown, tmdbIdRaw: unknown) {
    const mediaType = requireMediaType(mediaTypeRaw);
    const tmdbId = requireTmdbId(tmdbIdRaw);
    await this.db.run('DELETE FROM library_items WHERE user_id = ? AND media_type = ? AND tmdb_id = ?', [
      userId, mediaType, tmdbId,
    ]);
    return { removed: true };
  }

  private async getOne(userId: string, mediaType: string, tmdbId: number) {
    return this.db.first(`${SELECT_ITEM} WHERE user_id = ? AND media_type = ? AND tmdb_id = ?`, [
      userId, mediaType, tmdbId,
    ]);
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
}
