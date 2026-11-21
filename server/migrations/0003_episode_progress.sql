-- Velora API - per-episode watch progress (D1 / SQLite)

CREATE TABLE IF NOT EXISTS episode_progress (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tmdb_id    INTEGER NOT NULL,
  season     INTEGER NOT NULL,
  episode    INTEGER NOT NULL,
  watched_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, tmdb_id, season, episode)
);
CREATE INDEX IF NOT EXISTS idx_episode_progress_user_title ON episode_progress (user_id, tmdb_id);
