ALTER TABLE chats
ADD COLUMN IF NOT EXISTS system_key TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chats_system_key_unique'
  ) THEN
    ALTER TABLE chats
    ADD CONSTRAINT chats_system_key_unique UNIQUE (system_key);
  END IF;
END $$;

INSERT INTO chats(id, type, name, system_key)
VALUES ('00000000-0000-0000-0000-000000000001', 'channel', 'General', 'general')
ON CONFLICT (system_key) DO NOTHING;

INSERT INTO chat_members(chat_id, user_id)
SELECT '00000000-0000-0000-0000-000000000001', id
FROM users
ON CONFLICT (chat_id, user_id) DO NOTHING;

WITH legacy_general_chats AS (
  SELECT c.id
  FROM chats c
  WHERE c.system_key IS NULL
    AND c.type = 'channel'
    AND c.name = 'General'
    AND c.id <> '00000000-0000-0000-0000-000000000001'
)
UPDATE messages
SET chat_id = '00000000-0000-0000-0000-000000000001',
    client_message_id = NULL
WHERE chat_id IN (SELECT id FROM legacy_general_chats);

WITH legacy_general_chats AS (
  SELECT c.id
  FROM chats c
  WHERE c.system_key IS NULL
    AND c.type = 'channel'
    AND c.name = 'General'
    AND c.id <> '00000000-0000-0000-0000-000000000001'
)
DELETE FROM chat_members
WHERE chat_id IN (SELECT id FROM legacy_general_chats);

WITH legacy_general_chats AS (
  SELECT c.id
  FROM chats c
  WHERE c.system_key IS NULL
    AND c.type = 'channel'
    AND c.name = 'General'
    AND c.id <> '00000000-0000-0000-0000-000000000001'
)
DELETE FROM chats
WHERE id IN (SELECT id FROM legacy_general_chats);

UPDATE chats
SET updated_at = COALESCE(
  (SELECT MAX(created_at) FROM messages WHERE chat_id = '00000000-0000-0000-0000-000000000001'),
  updated_at
)
WHERE id = '00000000-0000-0000-0000-000000000001';
