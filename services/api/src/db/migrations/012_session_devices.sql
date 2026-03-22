ALTER TABLE refresh_tokens
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

UPDATE refresh_tokens
SET last_used_at = COALESCE(last_used_at, created_at, NOW())
WHERE last_used_at IS NULL;

ALTER TABLE refresh_tokens
ALTER COLUMN last_used_at SET DEFAULT NOW();

ALTER TABLE refresh_tokens
ALTER COLUMN last_used_at SET NOT NULL;

ALTER TABLE refresh_tokens
ADD COLUMN IF NOT EXISTS device_label TEXT;

UPDATE refresh_tokens
SET device_label = COALESCE(NULLIF(device_label, ''), 'Unknown device')
WHERE device_label IS NULL OR device_label = '';

ALTER TABLE refresh_tokens
ALTER COLUMN device_label SET DEFAULT 'Unknown device';

ALTER TABLE refresh_tokens
ALTER COLUMN device_label SET NOT NULL;

ALTER TABLE refresh_tokens
ADD COLUMN IF NOT EXISTS app_context TEXT;

ALTER TABLE refresh_tokens
ADD COLUMN IF NOT EXISTS has_push_token BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_last_used ON refresh_tokens(user_id, last_used_at DESC);
