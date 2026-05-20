import { eq } from 'drizzle-orm';
import { db, closeDb } from './pool.js';
import { serverSettings, signupInvites } from './schema.js';

const DEFAULT_INVITE = 'PENTHOUSE-ALPHA';

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function positiveInt(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function optionalDate(name: string) {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  const value = new Date(raw);
  if (Number.isNaN(value.valueOf())) {
    throw new Error(`${name} must be an ISO-8601 datetime`);
  }
  return value;
}

async function main() {
  const code = required('ALPHA_BOOTSTRAP_INVITE_CODE').toUpperCase();
  if (process.env.NODE_ENV === 'production' && code === DEFAULT_INVITE) {
    throw new Error(`Refusing to bootstrap production with the default ${DEFAULT_INVITE} invite`);
  }

  const label = process.env.ALPHA_BOOTSTRAP_INVITE_LABEL?.trim() || 'Production alpha invite';
  const maxUses = positiveInt('ALPHA_BOOTSTRAP_INVITE_MAX_USES', 25);
  const expiresAt = optionalDate('ALPHA_BOOTSTRAP_INVITE_EXPIRES_AT');

  await db.insert(serverSettings)
    .values({ key: 'registration_mode', value: 'invite_only' })
    .onConflictDoUpdate({
      target: serverSettings.key,
      set: { value: 'invite_only', updatedAt: new Date() }
    });

  const [invite] = await db.insert(signupInvites)
    .values({
      code,
      label,
      maxUses,
      expiresAt,
      revokedAt: null
    })
    .onConflictDoUpdate({
      target: signupInvites.code,
      set: {
        label,
        maxUses,
        expiresAt,
        revokedAt: null
      }
    })
    .returning();

  if (process.env.ALPHA_REVOKE_DEFAULT_INVITE === 'true' && code !== DEFAULT_INVITE) {
    await db.update(signupInvites)
      .set({ revokedAt: new Date() })
      .where(eq(signupInvites.code, DEFAULT_INVITE));
  }

  console.log(`alpha invite ready: ${invite.code} (${invite.uses}/${invite.maxUses} used)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
