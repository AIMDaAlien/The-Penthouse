ALTER TABLE chat_members
ADD COLUMN IF NOT EXISTS last_read_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_members_chat_last_read_message
ON chat_members(chat_id, last_read_message_id);
