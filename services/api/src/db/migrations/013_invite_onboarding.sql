-- server_settings table
CREATE TABLE IF NOT EXISTS server_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO server_settings (key, value)
VALUES ('registration_mode', 'invite_only')
ON CONFLICT (key) DO NOTHING;

-- Restructure signup_invites: add id and label, swap PK
ALTER TABLE signup_invites
ADD COLUMN IF NOT EXISTS id UUID;

-- Backfill existing rows with UUIDs
UPDATE signup_invites SET id = gen_random_uuid() WHERE id IS NULL;

ALTER TABLE signup_invites
ALTER COLUMN id SET NOT NULL,
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE signup_invites
ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT '';

-- Update label for existing alpha invite
UPDATE signup_invites SET label = 'Alpha invite' WHERE code = 'PENTHOUSE-ALPHA';

-- Swap PK from code to id (safely look up actual constraint name)
DO $$
DECLARE
  pk_name TEXT;
BEGIN
  SELECT conname INTO pk_name
  FROM pg_constraint
  WHERE conrelid = 'signup_invites'::regclass
    AND contype = 'p';
  IF pk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE signup_invites DROP CONSTRAINT %I', pk_name);
  END IF;
END $$;

ALTER TABLE signup_invites ADD PRIMARY KEY (id);

-- code must remain unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'signup_invites_code_unique'
  ) THEN
    ALTER TABLE signup_invites
    ADD CONSTRAINT signup_invites_code_unique UNIQUE (code);
  END IF;
END $$;

-- Drop system_key column and its constraint
ALTER TABLE signup_invites DROP CONSTRAINT IF EXISTS signup_invites_system_key_unique;
ALTER TABLE signup_invites DROP COLUMN IF EXISTS system_key;
