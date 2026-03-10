ALTER TABLE chat_members
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

UPDATE chat_members
SET last_read_at = COALESCE(last_read_at, NOW())
WHERE last_read_at IS NULL;

ALTER TABLE chat_members
ALTER COLUMN last_read_at SET DEFAULT NOW();

ALTER TABLE chat_members
ALTER COLUMN last_read_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_members_chat_last_read
ON chat_members(chat_id, last_read_at DESC);
