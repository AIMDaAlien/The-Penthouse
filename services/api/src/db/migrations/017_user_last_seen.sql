ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

UPDATE users
SET last_seen_at = COALESCE(last_seen_at, created_at, NOW())
WHERE last_seen_at IS NULL;

ALTER TABLE users
ALTER COLUMN last_seen_at SET DEFAULT NOW();
