import type {
  AdminMemberSummary,
  AuthUser,
  MeResponse,
  MemberDetail,
  MemberSummary,
  UserRole,
  UserStatus
} from '@penthouse/contracts';
import { normalizeUsername } from '@penthouse/contracts';
import { env } from '../config/env.js';

export type Queryable = {
  query: (text: string, values?: any[]) => Promise<{ rowCount: number | null; rows: any[] }>;
};

export type UserRow = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_media_id: string | null;
  avatar_storage_key: string | null;
  avatar_file_name: string | null;
  avatar_content_type: string | null;
  role: UserRole;
  status: UserStatus;
  must_change_password: boolean;
  test_notice_accepted_version: string | null;
  test_notice_accepted_at: string | null;
  created_at: string;
  password_hash?: string;
  recovery_code_hash?: string | null;
};

const USER_BASE_SELECT = `
  SELECT
    u.id,
    u.username,
    u.display_name,
    u.bio,
    u.avatar_media_id,
    u.role,
    u.status,
    u.must_change_password,
    u.test_notice_accepted_version,
    u.test_notice_accepted_at,
    u.created_at,
    u.password_hash,
    u.recovery_code_hash,
    m.storage_key AS avatar_storage_key,
    m.original_file_name AS avatar_file_name,
    m.content_type AS avatar_content_type
  FROM users u
  LEFT JOIN media_uploads m ON m.id = u.avatar_media_id
`;

const TEST_NOTICE_VERSION_PATTERN = /^(.*?)-v(\d+)$/i;

export function hasSatisfiedTestNoticeVersion(
  acceptedVersion: string | null,
  requiredVersion: string
): boolean {
  if (!acceptedVersion) return false;
  if (acceptedVersion === requiredVersion) return true;

  const acceptedMatch = acceptedVersion.match(TEST_NOTICE_VERSION_PATTERN);
  const requiredMatch = requiredVersion.match(TEST_NOTICE_VERSION_PATTERN);
  if (!acceptedMatch || !requiredMatch) {
    return false;
  }

  const acceptedPrefix = acceptedMatch[1];
  const acceptedRevision = Number(acceptedMatch[2]);
  const requiredPrefix = requiredMatch[1];
  const requiredRevision = Number(requiredMatch[2]);

  if (acceptedPrefix !== requiredPrefix) {
    return false;
  }

  return acceptedRevision >= requiredRevision;
}

export function requiresTestNoticeAck(row: Pick<UserRow, 'test_notice_accepted_version'>): boolean {
  return !hasSatisfiedTestNoticeVersion(row.test_notice_accepted_version, env.TEST_ACCOUNT_NOTICE_VERSION);
}

export function avatarUrlFromFileName(storageKey: string | null): string | null {
  return storageKey ? `/uploads/${encodeURIComponent(storageKey)}` : null;
}

export function mapAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: avatarUrlFromFileName(row.avatar_storage_key),
    role: row.role,
    mustChangePassword: row.must_change_password,
    mustAcceptTestNotice: requiresTestNoticeAck(row),
    requiredTestNoticeVersion: env.TEST_ACCOUNT_NOTICE_VERSION,
    acceptedTestNoticeVersion: row.test_notice_accepted_version
  };
}

export function mapMeResponse(row: UserRow): MeResponse {
  return {
    ...mapAuthUser(row),
    bio: row.bio,
    avatarMediaId: row.avatar_media_id
  };
}

export function mapMemberSummary(row: UserRow): MemberSummary {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: avatarUrlFromFileName(row.avatar_storage_key)
  };
}

export function mapMemberDetail(row: UserRow): MemberDetail {
  return {
    ...mapMemberSummary(row),
    bio: row.bio
  };
}

export function mapAdminMemberSummary(row: UserRow): AdminMemberSummary {
  return {
    ...mapMemberDetail(row),
    role: row.role,
    status: row.status,
    mustChangePassword: row.must_change_password,
    createdAt: new Date(row.created_at).toISOString()
  };
}

export async function getUserById(db: Queryable, userId: string): Promise<UserRow | null> {
  const result = await db.query(`${USER_BASE_SELECT} WHERE u.id = $1`, [userId]);
  return (result.rows[0] as UserRow | undefined) ?? null;
}

export async function getUserByUsername(db: Queryable, username: string): Promise<UserRow | null> {
  const result = await db.query(`${USER_BASE_SELECT} WHERE u.username = $1`, [username]);
  return (result.rows[0] as UserRow | undefined) ?? null;
}

export async function listMembers(db: Queryable, search: string, includeInactive = false): Promise<UserRow[]> {
  const normalized = search.trim();
  const escaped = normalized.replace(/[\\%_]/g, '\\$&');
  const like = `%${escaped}%`;
  const clauses = [includeInactive ? '1 = 1' : `u.status = 'active'`];

  if (normalized) {
    clauses.push(`(u.username ILIKE $1 ESCAPE '\\' OR u.display_name ILIKE $1 ESCAPE '\\')`);
  }

  const sql = `${USER_BASE_SELECT}
    WHERE ${clauses.join(' AND ')}
    ORDER BY LOWER(u.display_name), LOWER(u.username)`;
  const values = normalized ? [like] : [];
  const result = await db.query(sql, values);
  return result.rows as UserRow[];
}

export async function maybeBootstrapAdmin(db: Queryable, username?: string): Promise<void> {
  const bootstrapUsername = normalizeUsername(env.ADMIN_BOOTSTRAP_USERNAME || '');
  if (!bootstrapUsername) return;

  const candidate = username ? normalizeUsername(username) : bootstrapUsername;
  if (candidate !== bootstrapUsername) return;

  const adminExists = await db.query(`SELECT 1 FROM users WHERE role = 'admin' LIMIT 1`);
  if (adminExists.rowCount) return;

  await db.query(
    `UPDATE users
     SET role = 'admin'
     WHERE username = $1
       AND status = 'active'`,
    [bootstrapUsername]
  );
}
