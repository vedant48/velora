import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../../common/database.service';
import { hashPassword, randomId, signJwt, verifyPassword } from '../../common/crypto';
import { getEnv } from '../../env';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const TOKEN_TTL_SEC = 60 * 60 * 24 * 30; // 30 days

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  createdAt: string;
}

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  password_hash: string;
  email: string | null;
  created_at: string;
}

export function toPublicUser(row: UserRow): PublicUser {
  return { id: row.id, username: row.username, displayName: row.display_name, bio: row.bio, createdAt: row.created_at };
}

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService) {}

  async signup(usernameRaw: unknown, passwordRaw: unknown, displayNameRaw: unknown) {
    const username = String(usernameRaw ?? '').trim().toLowerCase();
    if (!USERNAME_RE.test(username)) {
      throw new BadRequestException('Username must be 3-20 chars: lowercase letters, numbers, underscore');
    }
    if (typeof passwordRaw !== 'string' || passwordRaw.length < 6 || passwordRaw.length > 200) {
      throw new BadRequestException('Password must be 6-200 characters');
    }
    const displayName =
      typeof displayNameRaw === 'string' && displayNameRaw.trim() ? displayNameRaw.trim().slice(0, 50) : username;
    const existing = await this.db.first<UserRow>('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) throw new ConflictException('Username already taken');
    const id = randomId();
    await this.db.run('INSERT INTO users (id, username, display_name, password_hash) VALUES (?, ?, ?, ?)', [
      id,
      username,
      displayName,
      await hashPassword(passwordRaw),
    ]);
    return this.issue(id);
  }

  async login(usernameRaw: unknown, passwordRaw: unknown) {
    const username = String(usernameRaw ?? '').trim().toLowerCase();
    const row = await this.db.first<UserRow>('SELECT * FROM users WHERE username = ?', [username]);
    if (!row || !row.password_hash || typeof passwordRaw !== 'string') {
      throw new UnauthorizedException('Invalid username or password');
    }
    if (!(await verifyPassword(passwordRaw, row.password_hash))) {
      throw new UnauthorizedException('Invalid username or password');
    }
    return this.issue(row.id);
  }

  async googleLogin(idTokenRaw: unknown) {
    const idToken = String(idTokenRaw ?? '');
    if (!idToken) throw new BadRequestException('idToken is required');
    // Verify with Google's public token endpoint; it rejects forged/expired tokens.
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) throw new UnauthorizedException('Google sign-in token was rejected');
    const claims = (await res.json()) as Record<string, unknown>;
    // Accept client IDs with or without the .apps.googleusercontent.com suffix:
    // the token's aud is always the full ID, but config may carry either form.
    const stripSuffix = (s: string) => s.trim().replace(/\.apps\.googleusercontent\.com$/i, '');
    const allowed = (getEnv().GOOGLE_CLIENT_IDS ?? '')
      .split(',')
      .map(stripSuffix)
      .filter(Boolean);
    if (allowed.length > 0 && !allowed.includes(stripSuffix(String(claims.aud ?? '')))) {
      throw new UnauthorizedException('Google token audience not recognized');
    }
    const verified = claims.email_verified === true || claims.email_verified === 'true';
    const email = String(claims.email ?? '').trim().toLowerCase();
    if (!verified || !email) throw new UnauthorizedException('Google account email not verified');

    let row = await this.db.first<UserRow>('SELECT * FROM users WHERE email = ?', [email]);
    if (!row) {
      // Derive a unique username from the email local part.
      const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '').slice(0, 16) || 'user';
      let username = base.length >= 3 ? base : `${base}_u`;
      for (let i = 0; i < 100; i++) {
        const clash = await this.db.first('SELECT id FROM users WHERE username = ?', [username]);
        if (!clash) break;
        username = `${base}_${Math.floor(Math.random() * 10000)}`.slice(0, 20);
      }
      const displayName = String(claims.name ?? username).trim().slice(0, 50) || username;
      const id = randomId();
      await this.db.run('INSERT INTO users (id, username, display_name, email) VALUES (?, ?, ?, ?)', [
        id,
        username,
        displayName,
        email,
      ]);
      row = await this.db.first<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
    }
    return this.issue(row!.id);
  }

  async me(userId: string) {
    const row = await this.db.first<UserRow>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!row) throw new UnauthorizedException('Account not found');
    return { user: toPublicUser(row) };
  }

  private async issue(userId: string) {
    const row = await this.db.first<UserRow>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!row) throw new UnauthorizedException('Account not found');
    const secret = getEnv().JWT_SECRET ?? 'dev-only-secret-change-me';
    const token = await signJwt({ sub: row.id, username: row.username }, secret, TOKEN_TTL_SEC);
    return { token, user: toPublicUser(row) };
  }
}
