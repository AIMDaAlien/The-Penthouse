CREATE TABLE IF NOT EXISTS _meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  timezone TEXT,
  last_seen_at TEXT,
  profile_style TEXT DEFAULT 'editorial',
  banner_url TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  counterpart_member_id TEXT,
  counterpart_avatar_url TEXT,
  notifications_muted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  parent_chat_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS folder_items (
  folder_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (folder_id, chat_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_username TEXT,
  sender_display_name TEXT,
  sender_avatar_url TEXT,
  content TEXT NOT NULL,
  type TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL,
  edited_at TEXT,
  edit_count INTEGER,
  deleted_at TEXT,
  deleted_by_user_id TEXT,
  client_message_id TEXT,
  seen_at TEXT,
  read_receipts TEXT,
  reactions TEXT,
  reply_to TEXT,
  starred INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pinned_messages (
  chat_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  pinned_by_user_id TEXT NOT NULL,
  pinned_at TEXT NOT NULL,
  content TEXT NOT NULL,
  sender_display_name TEXT,
  PRIMARY KEY (chat_id, message_id)
);

CREATE TABLE IF NOT EXISTS read_states (
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  last_read_at TEXT,
  last_read_message_id TEXT,
  notifications_muted INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TEXT,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_chat_content ON messages(chat_id, content);
CREATE INDEX IF NOT EXISTS idx_messages_client ON messages(chat_id, sender_id, client_message_id);
CREATE INDEX IF NOT EXISTS idx_channels_parent ON channels(parent_chat_id);
CREATE INDEX IF NOT EXISTS idx_folder_items_folder ON folder_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_outbox_next_retry ON outbox(next_retry_at);
