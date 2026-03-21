import type { Pool, PoolClient } from 'pg';

export type RegistrationMode = 'invite_only' | 'closed';

const VALID_REGISTRATION_MODES: readonly string[] = ['invite_only', 'closed'];

export async function getRegistrationMode(db: Pool | PoolClient): Promise<RegistrationMode> {
  const result = await db.query(
    `SELECT value FROM server_settings WHERE key = 'registration_mode'`
  );
  const value = result.rows[0]?.value;
  if (VALID_REGISTRATION_MODES.includes(value)) return value as RegistrationMode;
  return 'invite_only';
}

export async function setRegistrationMode(db: Pool | PoolClient, mode: RegistrationMode): Promise<void> {
  await db.query(
    `INSERT INTO server_settings (key, value, updated_at)
     VALUES ('registration_mode', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [mode]
  );
}
