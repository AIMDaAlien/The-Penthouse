-- Phase 1 feature schema additions
-- Applied manually to existing database

-- Presence state enum
DO $$ BEGIN
  CREATE TYPE "presence_state" AS ENUM('available', 'busy', 'dnd', 'afk', 'offline');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add presence fields to users
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "presence_state" "presence_state" DEFAULT 'offline' NOT NULL,
  ADD COLUMN IF NOT EXISTS "presence_note" text DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS "presence_note_updated_at" timestamp with time zone;

-- Pinned messages
CREATE TABLE IF NOT EXISTS "pinned_messages" (
  "chat_id" uuid NOT NULL REFERENCES "chats"("id") ON DELETE cascade,
  "message_id" uuid NOT NULL REFERENCES "messages"("id") ON DELETE cascade,
  "pinned_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "pinned_at" timestamp with time zone DEFAULT now() NOT NULL,
  "content_snapshot" text DEFAULT '' NOT NULL,
  "sender_display_name_snapshot" text,
  CONSTRAINT "pinned_messages_chat_id_message_id_pk" PRIMARY KEY("chat_id","message_id")
);
CREATE INDEX IF NOT EXISTS "idx_pinned_messages_chat_pinned_at" ON "pinned_messages" ("chat_id","pinned_at");

-- Chat folders
CREATE TABLE IF NOT EXISTS "chat_folders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "icon" text,
  "color" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_chat_folders_user" ON "chat_folders" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_chat_folders_user_sort" ON "chat_folders" ("user_id","sort_order");

-- Chat folder items
CREATE TABLE IF NOT EXISTS "chat_folder_items" (
  "folder_id" uuid NOT NULL REFERENCES "chat_folders"("id") ON DELETE cascade,
  "chat_id" uuid NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_chat_folder_items_folder" ON "chat_folder_items" ("folder_id");
CREATE INDEX IF NOT EXISTS "idx_chat_folder_items_chat" ON "chat_folder_items" ("chat_id");

-- User wallpapers
CREATE TABLE IF NOT EXISTS "user_wallpapers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "chat_id" uuid REFERENCES "chats"("id") ON DELETE cascade,
  "is_global" boolean DEFAULT false NOT NULL,
  "wallpaper_url" text,
  "wallpaper_color" text,
  "opacity" text DEFAULT '1' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Custom emotes
CREATE TABLE IF NOT EXISTS "custom_emotes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "media_upload_id" uuid NOT NULL REFERENCES "media_uploads"("id") ON DELETE cascade,
  "width" integer DEFAULT 48 NOT NULL,
  "height" integer DEFAULT 48 NOT NULL,
  "is_animated" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_custom_emotes_user" ON "custom_emotes" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_custom_emotes_name" ON "custom_emotes" ("name");

-- Sticker packs
CREATE TABLE IF NOT EXISTS "sticker_packs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "thumbnail_media_upload_id" uuid REFERENCES "media_uploads"("id") ON DELETE set null,
  "is_public" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Stickers
CREATE TABLE IF NOT EXISTS "stickers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "pack_id" uuid NOT NULL REFERENCES "sticker_packs"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "media_upload_id" uuid NOT NULL REFERENCES "media_uploads"("id") ON DELETE cascade,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_stickers_pack" ON "stickers" ("pack_id");
