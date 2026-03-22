import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { AuthResponseSchema, SessionSummarySchema, type SessionSummary } from '@penthouse/contracts';
import { createOpaqueToken, hashToken, refreshExpiryDate, signAccessToken } from './security.js';
import { getUserById, mapAuthUser, type Queryable } from './users.js';

const SESSION_DEVICE_LABEL_MAX_LENGTH = 120;
const SESSION_CONTEXT_MAX_LENGTH = 32;

export type SessionMetadata = {
  deviceLabel: string;
  appContext: string | null;
  hasPushToken: boolean;
};

type SessionRow = {
  id: string;
  created_at: string;
  last_used_at: string;
  device_label: string;
  app_context: string | null;
  has_push_token: boolean;
};

function sanitizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function fallbackDeviceLabel(userAgent: string): string {
  const normalized = userAgent.toLowerCase();
  if (normalized.includes('android')) return 'Android app';
  if (normalized.includes('iphone') || normalized.includes('ipad') || normalized.includes('ios')) return 'iOS app';
  return 'Web browser';
}

export function getSessionMetadataFromRequest(request: { headers: Record<string, unknown> }): SessionMetadata {
  const userAgent = typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : '';
  const appContext = sanitizeText(request.headers['x-penthouse-app-context'], SESSION_CONTEXT_MAX_LENGTH);
  const explicitDeviceLabel = sanitizeText(request.headers['x-penthouse-device-label'], SESSION_DEVICE_LABEL_MAX_LENGTH);
  const hasPushTokenHeader = sanitizeText(request.headers['x-penthouse-push-present'], 8);

  return {
    deviceLabel: explicitDeviceLabel ?? fallbackDeviceLabel(userAgent),
    appContext,
    hasPushToken: hasPushTokenHeader === '1' || hasPushTokenHeader === 'true'
  };
}

export function mergeSessionMetadata(
  preferred: Partial<SessionMetadata>,
  fallback: Partial<SessionMetadata> = {}
): SessionMetadata {
  return {
    deviceLabel: preferred.deviceLabel?.trim() || fallback.deviceLabel?.trim() || 'Unknown device',
    appContext: preferred.appContext?.trim() || fallback.appContext?.trim() || null,
    hasPushToken: typeof preferred.hasPushToken === 'boolean'
      ? preferred.hasPushToken
      : Boolean(fallback.hasPushToken)
  };
}

export function mapSessionSummary(row: SessionRow, currentSessionId: string | null): SessionSummary {
  return SessionSummarySchema.parse({
    id: row.id,
    createdAt: new Date(row.created_at).toISOString(),
    lastUsedAt: new Date(row.last_used_at).toISOString(),
    deviceLabel: row.device_label,
    appContext: row.app_context,
    hasPushToken: Boolean(row.has_push_token),
    current: currentSessionId === row.id
  });
}

export async function issueRecoveryCode(client: Queryable, userId: string, recoveryCode: string): Promise<void> {
  await client.query('UPDATE users SET recovery_code_hash = $1 WHERE id = $2', [
    hashToken(recoveryCode.replaceAll('-', '')),
    userId
  ]);
}

export async function createAuthResponse(
  app: FastifyInstance,
  client: Queryable,
  userId: string,
  recoveryCode?: string,
  sessionMetadata?: Partial<SessionMetadata>
) {
  const user = await getUserById(client, userId);
  if (!user) {
    throw new Error(`Missing user ${userId} while issuing auth response`);
  }

  const sessionId = randomUUID();
  const metadata = mergeSessionMetadata(sessionMetadata ?? {});
  const accessToken = await signAccessToken(app, user.id, user.username, sessionId);
  const refreshToken = createOpaqueToken();
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = refreshExpiryDate();

  await client.query(
    `INSERT INTO refresh_tokens(id, user_id, token_hash, expires_at, last_used_at, device_label, app_context, has_push_token)
     VALUES($1, $2, $3, $4, NOW(), $5, $6, $7)`,
    [
      sessionId,
      user.id,
      refreshTokenHash,
      expiresAt.toISOString(),
      metadata.deviceLabel,
      metadata.appContext,
      metadata.hasPushToken
    ]
  );

  return AuthResponseSchema.parse({
    user: mapAuthUser(user),
    accessToken,
    refreshToken,
    ...(recoveryCode ? { recoveryCode } : {})
  });
}

export async function listSessionsForUser(
  client: Queryable,
  userId: string,
  currentSessionId: string | null
): Promise<SessionSummary[]> {
  const result = await client.query(
    `SELECT id, created_at, last_used_at, device_label, app_context, has_push_token
     FROM refresh_tokens
     WHERE user_id = $1
       AND expires_at > NOW()
     ORDER BY CASE WHEN id = $2 THEN 0 ELSE 1 END, last_used_at DESC, created_at DESC`,
    [userId, currentSessionId]
  );

  return result.rows.map((row) => mapSessionSummary(row as SessionRow, currentSessionId));
}

export async function touchCurrentSessionPushState(
  client: Queryable,
  sessionId: string | null,
  hasPushToken: boolean
): Promise<void> {
  if (!sessionId) return;

  await client.query(
    `UPDATE refresh_tokens
     SET has_push_token = $1
     WHERE id = $2`,
    [hasPushToken, sessionId]
  );
}
