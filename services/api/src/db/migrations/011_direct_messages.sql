ALTER TABLE chat_members
ADD COLUMN IF NOT EXISTS notifications_muted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS direct_chats (
  chat_id UUID PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
  first_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  second_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT direct_chats_distinct_participants CHECK (first_user_id <> second_user_id),
  CONSTRAINT direct_chats_ordered_participants CHECK (first_user_id < second_user_id),
  CONSTRAINT direct_chats_unique_pair UNIQUE (first_user_id, second_user_id)
);

CREATE INDEX IF NOT EXISTS idx_direct_chats_first_user ON direct_chats(first_user_id);
CREATE INDEX IF NOT EXISTS idx_direct_chats_second_user ON direct_chats(second_user_id);
