ALTER TABLE media_uploads
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'private';

DO $$ BEGIN
  ALTER TABLE media_uploads ADD CONSTRAINT media_uploads_scope_check CHECK (scope IN ('public', 'private'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

UPDATE media_uploads
SET scope = 'public'
WHERE id IN (
  SELECT avatar_media_id FROM users WHERE avatar_media_id IS NOT NULL
  UNION
  SELECT banner_media_id FROM users WHERE banner_media_id IS NOT NULL
  UNION
  SELECT media_upload_id FROM custom_emotes
  UNION
  SELECT media_upload_id FROM stickers
  UNION
  SELECT thumbnail_media_upload_id FROM sticker_packs WHERE thumbnail_media_upload_id IS NOT NULL
);
