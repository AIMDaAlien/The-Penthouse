CREATE TABLE IF NOT EXISTS starred_messages (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  starred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_starred_messages_user ON starred_messages(user_id, starred_at DESC, message_id DESC);
CREATE INDEX IF NOT EXISTS idx_starred_messages_message ON starred_messages(message_id);
