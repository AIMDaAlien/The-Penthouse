ALTER TABLE users
ADD COLUMN IF NOT EXISTS recovery_code_hash TEXT;
