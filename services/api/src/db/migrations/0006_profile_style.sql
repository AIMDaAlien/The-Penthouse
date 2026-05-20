-- Add profile style and banner URL columns to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_style" text DEFAULT 'editorial' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "banner_url" text;

-- Drop wallpaper system
DROP TABLE IF EXISTS "user_wallpapers";
