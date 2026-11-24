-- Velora API - provenance for imported titles (D1 / SQLite)
-- Keeps the source app's own ID and last-modified time. The source has no original add date; on user
-- instruction its last-modified time is used as library_items.added_at for newly created titles, and
-- added_at_is_fallback = 1 records that this date is a fallback, not the original.
CREATE TABLE IF NOT EXISTS import_sources (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source             TEXT NOT NULL,
  source_id          TEXT NOT NULL,
  media_type         TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  tmdb_id            INTEGER NOT NULL,
  source_modified_at TEXT,
  added_at_is_fallback INTEGER NOT NULL DEFAULT 0,
  imported_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, source, source_id)
);
CREATE INDEX IF NOT EXISTS idx_import_sources_title ON import_sources (user_id, media_type, tmdb_id);
