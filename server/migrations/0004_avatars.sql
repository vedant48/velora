-- Profile photos: blob bytes live in user_avatars; users.avatar_at is the
-- public version marker used to build cache-busting avatar URLs.
-- Additive only; no existing rows are changed.
CREATE TABLE IF NOT EXISTS user_avatars (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mime       TEXT NOT NULL,
  data       BLOB NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE users ADD COLUMN avatar_at TEXT;
