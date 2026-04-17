ALTER TABLE chat_members
ADD COLUMN IF NOT EXISTS notifications_muted_updated_at TIMESTAMPTZ;

UPDATE chat_members
SET notifications_muted_updated_at = COALESCE(notifications_muted_updated_at, NOW())
WHERE notifications_muted_updated_at IS NULL;

ALTER TABLE chat_members
ALTER COLUMN notifications_muted_updated_at SET DEFAULT NOW();

ALTER TABLE chat_members
ALTER COLUMN notifications_muted_updated_at SET NOT NULL;
