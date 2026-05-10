ALTER TABLE chats ADD COLUMN parent_chat_id uuid NULL;
ALTER TABLE chats ADD CONSTRAINT chats_parent_chat_id_fk
  FOREIGN KEY (parent_chat_id) REFERENCES chats(id) ON DELETE CASCADE;
CREATE INDEX idx_chats_parent ON chats(parent_chat_id);
