CREATE TABLE IF NOT EXISTS sync_events (
  id bigserial PRIMARY KEY,
  scope text NOT NULL CHECK (scope IN ('chat', 'user', 'global')),
  op_type text NOT NULL,
  entity_id text NOT NULL,
  chat_id uuid,
  user_id uuid,
  actor_user_id uuid,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_events_created ON sync_events(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_events_chat ON sync_events(chat_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_user ON sync_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_scope ON sync_events(scope);
