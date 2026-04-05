CREATE INDEX IF NOT EXISTS idx_messages_chat_created_visible
  ON messages (chat_id, created_at DESC)
  WHERE hidden_by_moderation = FALSE;
