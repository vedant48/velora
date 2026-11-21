import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../../common/database.service';
import { getEnv } from '../../env';
import { LibraryService } from '../library/library.service';

const API = 'https://api.simkl.com';

interface SimklEnv {
  SIMKL_CLIENT_ID?: string;
  SIMKL_CLIENT_SECRET?: string;
}

function creds(): { id: string; secret: string } {
  const env = getEnv() as unknown as SimklEnv;
  const id = env.SIMKL_CLIENT_ID?.trim();
  const secret = env.SIMKL_CLIENT_SECRET?.trim();
  if (!id || !secret) {
    throw new ServiceUnavailableException(
      'SIMKL sync is not configured yet (SIMKL_CLIENT_ID/SIMKL_CLIENT_SECRET missing). Registering a SIMKL API app is free; see server README.',
    );
  }
  return { id, secret };
}

@Injectable()
export class SimklService {
  constructor(
    private readonly db: DatabaseService,
    private readonly library: LibraryService,
  ) {}

  async status(userId: string) {
    const row = await this.db.first('SELECT connected_at, last_sync_at FROM simkl_connections WHERE user_id = ?', [userId]);
    return { connected: !!row, ...(row ?? {}) };
  }

  /** Exchange a SIMKL OAuth code for an access token and store it. */
  async connect(userId: string, codeRaw: unknown, redirectUriRaw: unknown) {
    const { id, secret } = creds();
    const code = String(codeRaw ?? '');
    const redirectUri = String(redirectUriRaw ?? '');
    if (!code || !redirectUri) throw new BadRequestException('code and redirectUri are required');
    const res = await fetch(`${API}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: id,
        client_secret: secret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) throw new BadRequestException('SIMKL rejected the authorization code');
    const json = (await res.json()) as { access_token?: string };
    if (!json.access_token) throw new BadRequestException('SIMKL returned no access token');
    await this.db.run(
      `INSERT INTO simkl_connections (user_id, access_token) VALUES (?, ?)
       ON CONFLICT (user_id) DO UPDATE SET access_token = excluded.access_token, connected_at = datetime('now')`,
      [userId, json.access_token],
    );
    return { connected: true };
  }

  async disconnect(userId: string) {
    await this.db.run('DELETE FROM simkl_connections WHERE user_id = ?', [userId]);
    return { connected: false };
  }

  private async token(userId: string): Promise<string> {
    const row = await this.db.first<{ access_token: string }>(
      'SELECT access_token FROM simkl_connections WHERE user_id = ?',
      [userId],
    );
    if (!row) throw new BadRequestException('SIMKL account not connected');
    return row.access_token;
  }

  private async api<T>(userId: string, path: string, init?: RequestInit): Promise<T> {
    const { id } = creds();
    const token = await this.token(userId);
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'simkl-api-key': id,
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new BadRequestException(`SIMKL API error ${res.status}: ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  /** Pull the full SIMKL collection into Velora (SIMKL API is free for members). */
  async importFromSimkl(userId: string) {
    const data = await this.api<Record<string, unknown[]>>(userId, '/sync/all-items/');
    const result = await this.library.importSimkl(userId, data);
    await this.db.run("UPDATE simkl_connections SET last_sync_at = datetime('now') WHERE user_id = ?", [userId]);
    return result;
  }

  /** Push the Velora library to SIMKL. */
  async exportToSimkl(userId: string) {
    const items = await this.db.all<Record<string, unknown>>(
      'SELECT media_type, tmdb_id, title, status, rating FROM library_items WHERE user_id = ?',
      [userId],
    );
    const statusMap: Record<string, string> = { want: 'plantowatch', watching: 'watching', watched: 'completed' };
    const movies: unknown[] = [];
    const shows: unknown[] = [];
    const ratedMovies: unknown[] = [];
    const ratedShows: unknown[] = [];
    for (const i of items) {
      const entry = { to: statusMap[String(i.status)] ?? 'completed', ids: { tmdb: Number(i.tmdb_id) } };
      const rated = i.rating !== null && i.rating !== undefined
        ? { rating: Number(i.rating), ids: { tmdb: Number(i.tmdb_id) } }
        : null;
      if (i.media_type === 'tv') {
        shows.push(entry);
        if (rated) ratedShows.push(rated);
      } else {
        movies.push(entry);
        if (rated) ratedMovies.push(rated);
      }
    }
    await this.api(userId, '/sync/add-to-list', {
      method: 'POST',
      body: JSON.stringify({ movies, shows }),
    });
    if (ratedMovies.length || ratedShows.length) {
      await this.api(userId, '/sync/ratings', {
        method: 'POST',
        body: JSON.stringify({ movies: ratedMovies, shows: ratedShows }),
      });
    }
    await this.db.run("UPDATE simkl_connections SET last_sync_at = datetime('now') WHERE user_id = ?", [userId]);
    return { exported: items.length, rated: ratedMovies.length + ratedShows.length };
  }
}
