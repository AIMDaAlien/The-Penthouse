ALTER TABLE device_tokens
  ADD COLUMN notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN previews_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN quiet_hours_start_minute INTEGER,
  ADD COLUMN quiet_hours_end_minute INTEGER,
  ADD COLUMN timezone TEXT;
