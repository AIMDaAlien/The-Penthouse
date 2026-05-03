CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  scope_default TEXT NOT NULL DEFAULT 'dm_and_mention'
    CHECK (scope_default IN ('off', 'dm_only', 'dm_and_mention', 'all')),
  payload_privacy TEXT NOT NULL DEFAULT 'metadata'
    CHECK (payload_privacy IN ('metadata', 'full')),
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_tz TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_prefs_quiet_hours_complete CHECK (
    quiet_hours_enabled = FALSE
    OR (
      quiet_hours_start IS NOT NULL
      AND quiet_hours_end IS NOT NULL
      AND quiet_hours_tz IS NOT NULL
    )
  )
);

CREATE TABLE IF NOT EXISTS chat_notification_overrides (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  scope TEXT NOT NULL
    CHECK (scope IN ('off', 'mentions_only', 'all')),
  dnd_override BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_notification_overrides_chat
  ON chat_notification_overrides(chat_id);
