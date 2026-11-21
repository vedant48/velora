-- 0002: account privacy flag. 0 = public to signed-in members, 1 = private
-- (profile visible, library/stats hidden from everyone but the owner).
ALTER TABLE users ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0;
