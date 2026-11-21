export interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
  /** Comma-separated Google OAuth client IDs accepted for Google sign-in. */
  GOOGLE_CLIENT_IDS?: string;
}

let currentEnv: Env | null = null;

export function setEnv(env: Env): void {
  currentEnv = env;
}

export function getEnv(): Env {
  if (!currentEnv) {
    throw new Error('Worker environment not initialized');
  }
  return currentEnv;
}
