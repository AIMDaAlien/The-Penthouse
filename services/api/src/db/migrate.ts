import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrations = [
  '001_initial.sql',
  '002_shared_general.sql',
  '003_auth_recovery.sql',
  '004_user_management.sql',
  '005_media_messages.sql',
  '006_read_state.sql',
  '007_test_account_notice.sql',
  '008_device_tokens.sql',
  '009_device_notification_settings.sql',
  '010_message_moderation.sql',
  '011_direct_messages.sql',
  '012_session_devices.sql',
  '013_invite_onboarding.sql',
  '014_refresh_token_grace.sql',
  '015_messages_visible_chat_created_index.sql'
];

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    // Serialize migration runners so parallel test suites do not race on setup.
    await client.query('SELECT pg_advisory_xact_lock($1)', [424242]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const migrationName of migrations) {
      const already = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [migrationName]);
      if (already.rowCount) continue;

      const sqlPath = path.join(__dirname, 'migrations', migrationName);
      const sql = await readFile(sqlPath, 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [migrationName]);
      console.log(`[migration] applied ${migrationName}`);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(async () => {
      await pool.end();
      console.log('[migration] complete');
    })
    .catch(async (error) => {
      console.error('[migration] failed', error);
      await pool.end();
      process.exit(1);
    });
}
