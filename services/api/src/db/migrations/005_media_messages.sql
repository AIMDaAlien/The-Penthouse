ALTER TABLE media_uploads
ADD COLUMN IF NOT EXISTS original_file_name TEXT,
ADD COLUMN IF NOT EXISTS storage_key TEXT,
ADD COLUMN IF NOT EXISTS media_kind TEXT;

UPDATE media_uploads
SET original_file_name = COALESCE(original_file_name, file_name)
WHERE original_file_name IS NULL;

UPDATE media_uploads
SET storage_key = COALESCE(
  storage_key,
  NULLIF(regexp_replace(file_path, '^.*[\\\\/]', ''), ''),
  file_name
)
WHERE storage_key IS NULL;

UPDATE media_uploads
SET media_kind = COALESCE(
  media_kind,
  CASE
    WHEN content_type LIKE 'image/%' THEN 'image'
    WHEN content_type LIKE 'video/%' THEN 'video'
    ELSE 'file'
  END
);

ALTER TABLE media_uploads
ALTER COLUMN original_file_name SET NOT NULL;

ALTER TABLE media_uploads
ALTER COLUMN storage_key SET NOT NULL;

ALTER TABLE media_uploads
ALTER COLUMN media_kind SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_uploads_media_kind_check'
  ) THEN
    ALTER TABLE media_uploads
    ADD CONSTRAINT media_uploads_media_kind_check
    CHECK (media_kind IN ('image', 'video', 'file'));
  END IF;
END $$;

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text',
ADD COLUMN IF NOT EXISTS metadata JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_message_type_check'
  ) THEN
    ALTER TABLE messages
    ADD CONSTRAINT messages_message_type_check
    CHECK (message_type IN ('text', 'image', 'video', 'gif', 'file'));
  END IF;
END $$;
