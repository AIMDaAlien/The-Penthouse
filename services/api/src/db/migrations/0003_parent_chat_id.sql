ALTER TABLE chats ADD COLUMN IF NOT EXISTS parent_chat_id uuid NULL;

DO $$ BEGIN
  ALTER TABLE chats ADD CONSTRAINT chats_parent_chat_id_fk
    FOREIGN KEY (parent_chat_id) REFERENCES chats(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_chats_parent ON chats(parent_chat_id);
