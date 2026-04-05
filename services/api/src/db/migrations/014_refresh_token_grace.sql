ALTER TABLE refresh_tokens
ADD COLUMN IF NOT EXISTS rotated_at TIMESTAMPTZ;

ALTER TABLE refresh_tokens
ADD COLUMN IF NOT EXISTS rotated_to_token_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_rotated_to_token_hash
  ON refresh_tokens(rotated_to_token_hash);
