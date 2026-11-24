-- Velora API - provenance for imported titles (D1 / SQLite)
-- Keeps the source app's own ID and last-modified time. The source's last-modified time is NOT an
-- original add/watch date, so it is stored here and never written into library_items.added_at.
CREATE TABLE IF NOT EXISTS import_sources (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source             TEXT NOT NULL,
  source_id          TEXT NOT NULL,
  media_type         TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  tmdb_id            INTEGER NOT NULL,
  source_modified_at TEXT,
  imported_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, source, source_id)
);
CREATE INDEX IF NOT EXISTS idx_import_sources_title ON import_sources (user_id, media_type, tmdb_id);
