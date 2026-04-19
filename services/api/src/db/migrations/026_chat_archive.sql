ALTER TABLE chat_members
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_chat_members_user_archived
  ON chat_members(user_id, archived_at);
