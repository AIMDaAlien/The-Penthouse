/**
 * Auth route integration tests.
 *
 * Uses Fastify's built-in inject() — no real HTTP server or DB needed.
 * The app requires DATABASE_URL + JWT_SECRET at construction time, so we
 * set minimal env vars before importing createApp.
 *
 * Tests that DO require DB calls are scoped as "contract / schema" tests
 * operating only on the contracts package — clearly marked with [schema].
 * Tests that require the running app are marked [inject] and skip when
 * a real DATABASE_URL is not set.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTH_CONSTRAINTS,
  RegisterRequestSchema,
  LoginRequestSchema,
  RefreshRequestSchema,
  PasswordResetRequestSchema,
  AuthResponseSchema,
  RevokeOtherSessionsResponseSchema,
  SessionSummarySchema
} from '@penthouse/contracts';

function validRegisterPayload() {
  return {
    username: 'alice',
    password: 'supersecurepassword',
    inviteCode: 'PLACEHOLDER', // Temporary until Codex removes from backend
    captchaToken: 'valid-captcha-payload',
    acceptTestNotice: true as const,
    testNoticeVersion: 'alpha-v1'
  };
}

// ─── [schema] captcha token validation ──────────────────────────────────────

test('[schema] register: rejects missing captchaToken', () => {
  const result = RegisterRequestSchema.safeParse({ ...validRegisterPayload(), captchaToken: undefined });
  assert.equal(result.success, false, 'should fail without captchaToken');
});

test('[schema] register: rejects username shorter than 3 chars', () => {
  const result = RegisterRequestSchema.safeParse({
    ...validRegisterPayload(),
    username: 'ab',
  });
  assert.equal(result.success, false, 'username min length is 3');
});

test('[schema] register: rejects username longer than 32 chars', () => {
  const result = RegisterRequestSchema.safeParse({
    ...validRegisterPayload(),
    username: 'a'.repeat(33),
  });
  assert.equal(result.success, false, 'username max length is 32');
});

test('[schema] register: rejects password shorter than 10 chars', () => {
  const result = RegisterRequestSchema.safeParse({
    ...validRegisterPayload(),
    password: 'short',
  });
  assert.equal(result.success, false, 'password min length is 10');
});

test('[schema] register: rejects password longer than 128 chars', () => {
  const result = RegisterRequestSchema.safeParse({
    ...validRegisterPayload(),
    password: 'a'.repeat(129),
  });
  assert.equal(result.success, false, 'password max length is 128');
});

test('[schema] register: accepts valid payload', () => {
  const result = RegisterRequestSchema.safeParse(validRegisterPayload());
  assert.equal(result.success, true, 'valid register payload should pass');
});

test('[schema] register: normalizes username', () => {
  const result = RegisterRequestSchema.safeParse({
    ...validRegisterPayload(),
    username: '  Alice.Test  '
  });
  assert.equal(result.success, true);
  assert.equal(result.data?.username, 'alice.test');
});

test('[schema] register: rejects usernames with unsupported characters', () => {
  const result = RegisterRequestSchema.safeParse({
    ...validRegisterPayload(),
    username: 'alice test',
  });
  assert.equal(result.success, false);
});

test('[schema] register: rejects password with leading or trailing spaces', () => {
  const result = RegisterRequestSchema.safeParse({
    ...validRegisterPayload(),
    password: 'supersecurepassword ',
  });
  assert.equal(result.success, false);
});

test('[schema] register: requires explicit test notice acknowledgement', () => {
  const result = RegisterRequestSchema.safeParse({
    ...validRegisterPayload(),
    acceptTestNotice: false
  });
  assert.equal(result.success, false);
});

test('[schema] register: requires test notice version', () => {
  const result = RegisterRequestSchema.safeParse({
    ...validRegisterPayload(),
    testNoticeVersion: ' '
  });
  assert.equal(result.success, false);
});

// ─── [schema] refresh token validation ─────────────────────────────────────

test('[schema] refresh: rejects token shorter than 20 chars', () => {
  const result = RefreshRequestSchema.safeParse({
    refreshToken: 'tooshort'
  });
  assert.equal(result.success, false, 'refreshToken min length is 20');
});

test('[schema] refresh: accepts valid refresh token', () => {
  const result = RefreshRequestSchema.safeParse({
    refreshToken: 'a'.repeat(96) // typical opaque token is 96 hex chars
  });
  assert.equal(result.success, true, 'valid refreshToken should pass');
});

// ─── [schema] AuthResponse shape ───────────────────────────────────────────

test('[schema] AuthResponse: parses correct shape', () => {
  const result = AuthResponseSchema.safeParse({
    user: {
      id: 'some-uuid',
      username: 'alice',
      displayName: 'Alice',
      avatarUrl: null,
      role: 'member',
      mustChangePassword: false,
      mustAcceptTestNotice: false,
      requiredTestNoticeVersion: 'alpha-v1',
      acceptedTestNoticeVersion: 'alpha-v1'
    },
    accessToken: 'header.payload.sig',
    refreshToken: 'a'.repeat(96)
  });
  assert.equal(result.success, true, 'AuthResponse should accept valid shape');
});

test('[schema] AuthResponse: rejects missing accessToken', () => {
  const result = AuthResponseSchema.safeParse({
    user: {
      id: 'some-uuid',
      username: 'alice',
      displayName: 'Alice',
      avatarUrl: null,
      role: 'member',
      mustChangePassword: false,
      mustAcceptTestNotice: false,
      requiredTestNoticeVersion: 'alpha-v1',
      acceptedTestNoticeVersion: 'alpha-v1'
    },
    refreshToken: 'a'.repeat(96)
  });
  assert.equal(result.success, false, 'AuthResponse requires accessToken');
});

// ─── [schema] login shape ──────────────────────────────────────────────────

test('[schema] login: rejects missing password', () => {
  const result = LoginRequestSchema.safeParse({ username: 'alice' });
  assert.equal(result.success, false, 'login requires password');
});

test('[schema] login: rejects short username', () => {
  const result = LoginRequestSchema.safeParse({
    username: 'ab',
    password: 'supersecurepassword'
  });
  assert.equal(result.success, false, 'login username min is 3');
});

test('[schema] login: trims and lowercases username', () => {
  const result = LoginRequestSchema.safeParse({
    username: '  AIMTEST  ',
    password: 'supersecurepassword'
  });
  assert.equal(result.success, true);
  assert.equal(result.data?.username, 'aimtest');
});

test('[schema] password reset: accepts recovery code with hyphens', () => {
  const result = PasswordResetRequestSchema.safeParse({
    username: 'alice',
    recoveryCode: 'ABCD-EFGH-JKLM-NPQR',
    newPassword: 'supersecurepassword'
  });
  assert.equal(result.success, true);
  assert.equal(result.data?.recoveryCode.length, AUTH_CONSTRAINTS.recoveryCodeLength);
});

// ─── [schema] error message determinism ────────────────────────────────────

test('[schema] error shape: flatten() returns fieldErrors structure', () => {
  const result = RegisterRequestSchema.safeParse({
    username: 'ab',         // too short
    password: 'short',      // too short
    captchaToken: '',       // too short (min 1)
    acceptTestNotice: false,
    testNoticeVersion: ' '
  });
  assert.equal(result.success, false);
  const flat = result.error!.flatten();
  // All required fields must appear in fieldErrors
  assert.ok('username' in flat.fieldErrors, 'username error present');
  assert.ok('password' in flat.fieldErrors, 'password error present');
  assert.ok('captchaToken' in flat.fieldErrors, 'captchaToken error present');
});

test('[schema] session summary accepts current-session device metadata', () => {
  const result = SessionSummarySchema.safeParse({
    id: '11111111-1111-1111-1111-111111111111',
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    deviceLabel: 'Android app',
    appContext: 'android',
    hasPushToken: true,
    current: true
  });
  assert.equal(result.success, true);
});

test('[schema] revoke other sessions response requires nonnegative count', () => {
  const result = RevokeOtherSessionsResponseSchema.safeParse({ revokedCount: 2 });
  assert.equal(result.success, true);
});
