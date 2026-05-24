CREATE INDEX IF NOT EXISTS idx_chat_members_last_read_message
ON chat_members(last_read_message_id);
