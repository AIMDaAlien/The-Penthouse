CREATE UNIQUE INDEX IF NOT EXISTS unique_chat_folder_item
  ON chat_folder_items (folder_id, chat_id);
