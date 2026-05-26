UPDATE server_settings
SET value = 'open',
    updated_at = NOW()
WHERE key = 'registration_mode'
  AND value = 'invite_only';
