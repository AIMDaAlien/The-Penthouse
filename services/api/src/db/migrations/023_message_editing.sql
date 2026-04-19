ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_message_type_check;

ALTER TABLE messages
ADD CONSTRAINT messages_message_type_check
CHECK (message_type IN ('text', 'image', 'video', 'gif', 'file', 'poll', 'audio'));
