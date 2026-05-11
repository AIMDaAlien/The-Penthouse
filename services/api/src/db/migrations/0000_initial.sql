CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin', 'member'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE user_status AS ENUM ('active', 'removed', 'banned'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE chat_type AS ENUM ('dm', 'channel'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE message_type AS ENUM ('text', 'image', 'video', 'gif', 'file', 'poll', 'audio'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE media_kind AS ENUM ('image', 'video', 'file'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE moderation_action AS ENUM ('hide', 'unhide'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notification_scope AS ENUM ('off', 'dm_only', 'dm_and_mention', 'all'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE chat_override_scope AS ENUM ('off', 'mentions_only', 'all'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payload_privacy AS ENUM ('private', 'metadata', 'full'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  bio text,
  avatar_media_id uuid,
  role user_role NOT NULL DEFAULT 'member',
  status user_status NOT NULL DEFAULT 'active',
  must_change_password boolean NOT NULL DEFAULT false,
  recovery_code_hash text,
  timezone text,
  last_seen_at timestamptz DEFAULT now(),
  test_notice_accepted_version text,
  test_notice_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS signup_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  max_uses integer NOT NULL DEFAULT 1,
  uses integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS server_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_label text NOT NULL DEFAULT 'Unknown device',
  app_context text,
  has_push_token boolean NOT NULL DEFAULT false,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_device_id uuid REFERENCES session_devices(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  rotated_at timestamptz,
  rotated_to_token_hash text
);

CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type chat_type NOT NULL,
  name text NOT NULL,
  system_key text UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_members (
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  last_read_message_id uuid,
  notifications_muted boolean NOT NULL DEFAULT false,
  notifications_muted_updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS direct_chats (
  chat_id uuid PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
  first_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  second_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_direct_chat_pair UNIQUE (first_user_id, second_user_id),
  CONSTRAINT direct_chats_order_check CHECK (first_user_id < second_user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  client_message_id text,
  message_type message_type NOT NULL DEFAULT 'text',
  metadata jsonb,
  reply_to_message_id uuid,
  reply_to_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_client_message UNIQUE (chat_id, sender_id, client_message_id)
);

ALTER TABLE chat_members
  ADD CONSTRAINT chat_members_last_read_message_id_messages_id_fk
  FOREIGN KEY (last_read_message_id) REFERENCES messages(id) ON DELETE SET NULL;

ALTER TABLE messages
  ADD CONSTRAINT messages_reply_to_message_id_messages_id_fk
  FOREIGN KEY (reply_to_message_id) REFERENCES messages(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS message_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  previous_content text NOT NULL,
  edited_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_deletions (
  message_id uuid PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
  deleted_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deleted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_moderation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  action moderation_action NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  original_file_name text NOT NULL,
  storage_key text NOT NULL UNIQUE,
  size_bytes integer NOT NULL,
  content_type text,
  media_kind media_kind NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users
  ADD CONSTRAINT users_avatar_media_id_media_uploads_id_fk
  FOREIGN KEY (avatar_media_id) REFERENCES media_uploads(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS message_reactions (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji),
  CONSTRAINT emoji_length_check CHECK (length(emoji) BETWEEN 1 AND 8)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_device_id uuid REFERENCES session_devices(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_push_subscription UNIQUE (user_id, endpoint)
);

CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  scope_default notification_scope NOT NULL DEFAULT 'dm_and_mention',
  payload_privacy payload_privacy NOT NULL DEFAULT 'metadata',
  quiet_hours_enabled boolean NOT NULL DEFAULT false,
  quiet_hours_start time,
  quiet_hours_end time,
  quiet_hours_tz text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quiet_hours_complete CHECK (
    quiet_hours_enabled = false OR (
      quiet_hours_start IS NOT NULL AND
      quiet_hours_end IS NOT NULL AND
      quiet_hours_tz IS NOT NULL
    )
  )
);

CREATE TABLE IF NOT EXISTS chat_notification_overrides (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  scope chat_override_scope NOT NULL,
  dnd_override boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chat_id)
);

CREATE TABLE IF NOT EXISTS push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  payload_version integer NOT NULL DEFAULT 1,
  sent_at timestamptz NOT NULL DEFAULT now(),
  succeeded boolean NOT NULL,
  error_code text
);

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session ON refresh_tokens(session_device_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_rotated_to_token_hash ON refresh_tokens(rotated_to_token_hash);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_chat_last_read ON chat_members(chat_id, last_read_at);
CREATE INDEX IF NOT EXISTS idx_chat_members_chat_last_read_message ON chat_members(chat_id, last_read_message_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_archived ON chat_members(user_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_direct_chats_first_user ON direct_chats(first_user_id);
CREATE INDEX IF NOT EXISTS idx_direct_chats_second_user ON direct_chats(second_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_message_id ON messages(reply_to_message_id);
CREATE INDEX IF NOT EXISTS idx_message_edits_message ON message_edits(message_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_uploader ON media_uploads(uploader_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_session ON push_subscriptions(session_device_id);
CREATE INDEX IF NOT EXISTS idx_chat_notification_overrides_chat ON chat_notification_overrides(chat_id);

INSERT INTO server_settings (key, value)
VALUES ('registration_mode', 'invite_only')
ON CONFLICT (key) DO NOTHING;

INSERT INTO signup_invites (code, label, max_uses)
VALUES ('PENTHOUSE-ALPHA', 'Default alpha invite', 999999)
ON CONFLICT (code) DO NOTHING;

INSERT INTO chats (type, name, system_key)
VALUES ('channel', 'General', 'general')
ON CONFLICT (system_key) DO NOTHING;
