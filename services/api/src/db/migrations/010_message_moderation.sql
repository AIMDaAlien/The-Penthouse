ALTER TABLE messages
ADD COLUMN IF NOT EXISTS hidden_by_moderation BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS moderation_action TEXT,
ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
ADD COLUMN IF NOT EXISTS moderation_actor_user_id UUID,
ADD COLUMN IF NOT EXISTS moderation_updated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_moderation_action_check'
  ) THEN
    ALTER TABLE messages
    ADD CONSTRAINT messages_moderation_action_check
    CHECK (moderation_action IS NULL OR moderation_action IN ('hide', 'unhide'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_moderation_actor_user_id_fkey'
  ) THEN
    ALTER TABLE messages
    ADD CONSTRAINT messages_moderation_actor_user_id_fkey
    FOREIGN KEY (moderation_actor_user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS message_moderation_events (
  id UUID PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('hide', 'unhide')),
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_hidden_by_moderation ON messages(hidden_by_moderation);
CREATE INDEX IF NOT EXISTS idx_message_moderation_events_message ON message_moderation_events(message_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_moderation_events_created ON message_moderation_events(created_at DESC);
