-- Velora API - initial schema (D1 / SQLite)

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name  TEXT NOT NULL,
  bio           TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL DEFAULT '',
  email         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS library_items (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_type       TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  tmdb_id          INTEGER NOT NULL,
  title            TEXT NOT NULL,
  poster_path      TEXT,
  backdrop_path    TEXT,
  release_date     TEXT,
  status           TEXT NOT NULL CHECK (status IN ('want', 'watching', 'watched')),
  rating           INTEGER CHECK (rating BETWEEN 0 AND 10),
  episodes_watched INTEGER NOT NULL DEFAULT 0,
  total_episodes   INTEGER NOT NULL DEFAULT 0,
  added_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, media_type, tmdb_id)
);
CREATE INDEX IF NOT EXISTS idx_library_user_status ON library_items (user_id, status);
CREATE INDEX IF NOT EXISTS idx_library_user_updated ON library_items (user_id, updated_at DESC);

-- Reviews cover whole titles (season_number = 0) and single seasons (season_number >= 1).
CREATE TABLE IF NOT EXISTS reviews (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_type    TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  tmdb_id       INTEGER NOT NULL,
  season_number INTEGER NOT NULL DEFAULT 0,
  rating        INTEGER CHECK (rating BETWEEN 0 AND 10),
  body          TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, media_type, tmdb_id, season_number)
);
CREATE INDEX IF NOT EXISTS idx_reviews_title ON reviews (media_type, tmdb_id);

CREATE TABLE IF NOT EXISTS follows (
  id          TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (follower_id, followee_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows (followee_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS simkl_connections (
  user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  access_token  TEXT NOT NULL,
  connected_at  TEXT NOT NULL DEFAULT (datetime('now')),
  last_sync_at  TEXT
);
