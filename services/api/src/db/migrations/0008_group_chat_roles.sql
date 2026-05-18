DO $$ BEGIN
  CREATE TYPE chat_member_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE chat_members
  ADD COLUMN IF NOT EXISTS role chat_member_role NOT NULL DEFAULT 'member';

UPDATE chats
SET type = 'group'
WHERE type = 'channel'
  AND parent_chat_id IS NULL;

UPDATE chat_members
SET role = 'owner'
FROM chats, users
WHERE chat_members.chat_id = chats.id
  AND chat_members.user_id = users.id
  AND chats.type = 'group'
  AND chats.parent_chat_id IS NULL
  AND users.role = 'admin';

DO $$ BEGIN
  ALTER TABLE chats
    ADD CONSTRAINT chats_type_parent_invariant CHECK (
      ((type = 'dm' OR type = 'group') AND parent_chat_id IS NULL)
      OR (type = 'channel' AND parent_chat_id IS NOT NULL)
    ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE chats VALIDATE CONSTRAINT chats_type_parent_invariant;
