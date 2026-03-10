ALTER TABLE users
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_media_id UUID,
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member',
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users
SET display_name = username
WHERE display_name IS NULL;

ALTER TABLE users
ALTER COLUMN display_name SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'member'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_status_check'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'removed', 'banned'));
  END IF;
END $$;

ALTER TABLE media_uploads
ADD COLUMN IF NOT EXISTS content_type TEXT;

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_avatar_media_id_fkey;

ALTER TABLE users
ADD CONSTRAINT users_avatar_media_id_fkey
FOREIGN KEY (avatar_media_id) REFERENCES media_uploads(id) ON DELETE SET NULL;

ALTER TABLE signup_invites
ADD COLUMN IF NOT EXISTS system_key TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'signup_invites_system_key_unique'
  ) THEN
    ALTER TABLE signup_invites
    ADD CONSTRAINT signup_invites_system_key_unique UNIQUE (system_key);
  END IF;
END $$;

UPDATE signup_invites
SET system_key = 'master'
WHERE code = 'PENTHOUSE-ALPHA'
  AND system_key IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM signup_invites WHERE system_key = 'master'
  );

INSERT INTO signup_invites (code, max_uses, uses, system_key)
SELECT 'PENTHOUSE-ALPHA', 999999, 0, 'master'
WHERE NOT EXISTS (
  SELECT 1 FROM signup_invites WHERE system_key = 'master'
);

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
