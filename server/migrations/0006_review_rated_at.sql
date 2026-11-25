-- Velora API - when a review's rating last changed, separate from text edits (updated_at).
-- Existing rows keep their data; rated_at starts at their last update.
ALTER TABLE reviews ADD COLUMN rated_at TEXT;
UPDATE reviews SET rated_at = updated_at WHERE rating IS NOT NULL;
