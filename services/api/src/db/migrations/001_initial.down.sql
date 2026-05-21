DROP TABLE IF EXISTS media_uploads;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS chat_members;
DROP TABLE IF EXISTS chats;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS signup_invites;
DROP TABLE IF EXISTS users;
-- Down migrations are not executed by the production migration runner (migrate.ts).
-- The migration tracker table is api_migrations, not schema_migrations.
DROP TABLE IF EXISTS api_migrations;
