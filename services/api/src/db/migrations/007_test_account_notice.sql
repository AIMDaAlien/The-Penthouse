ALTER TABLE users
ADD COLUMN IF NOT EXISTS test_notice_accepted_version TEXT,
ADD COLUMN IF NOT EXISTS test_notice_accepted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_test_notice_accepted_version
  ON users(test_notice_accepted_version);
