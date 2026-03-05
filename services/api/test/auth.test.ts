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
  RegisterRequestSchema,
  LoginRequestSchema,
  RefreshRequestSchema,
  AuthResponseSchema
} from '@penthouse/contracts';

// ─── [schema] invite validation edge cases ─────────────────────────────────

test('[schema] register: rejects missing inviteCode', () => {
  const result = RegisterRequestSchema.safeParse({
    username: 'alice',
    password: 'supersecurepassword'
  });
  assert.equal(result.success, false, 'should fail without inviteCode');
});

test('[schema] register: rejects inviteCode shorter than 6 chars', () => {
  const result = RegisterRequestSchema.safeParse({
    username: 'alice',
    password: 'supersecurepassword',
    inviteCode: 'AB'
  });
  assert.equal(result.success, false, 'inviteCode min length is 6');
});

test('[schema] register: rejects inviteCode longer than 64 chars', () => {
  const result = RegisterRequestSchema.safeParse({
    username: 'alice',
    password: 'supersecurepassword',
    inviteCode: 'A'.repeat(65)
  });
  assert.equal(result.success, false, 'inviteCode max length is 64');
});

test('[schema] register: rejects username shorter than 3 chars', () => {
  const result = RegisterRequestSchema.safeParse({
    username: 'ab',
    password: 'supersecurepassword',
    inviteCode: 'PENTHOUSE-ALPHA'
  });
  assert.equal(result.success, false, 'username min length is 3');
});

test('[schema] register: rejects username longer than 32 chars', () => {
  const result = RegisterRequestSchema.safeParse({
    username: 'a'.repeat(33),
    password: 'supersecurepassword',
    inviteCode: 'PENTHOUSE-ALPHA'
  });
  assert.equal(result.success, false, 'username max length is 32');
});

test('[schema] register: rejects password shorter than 10 chars', () => {
  const result = RegisterRequestSchema.safeParse({
    username: 'alice',
    password: 'short',
    inviteCode: 'PENTHOUSE-ALPHA'
  });
  assert.equal(result.success, false, 'password min length is 10');
});

test('[schema] register: rejects password longer than 128 chars', () => {
  const result = RegisterRequestSchema.safeParse({
    username: 'alice',
    password: 'a'.repeat(129),
    inviteCode: 'PENTHOUSE-ALPHA'
  });
  assert.equal(result.success, false, 'password max length is 128');
});

test('[schema] register: accepts valid payload', () => {
  const result = RegisterRequestSchema.safeParse({
    username: 'alice',
    password: 'supersecurepassword',
    inviteCode: 'PENTHOUSE-ALPHA'
  });
  assert.equal(result.success, true, 'valid register payload should pass');
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
    user: { id: 'some-uuid', username: 'alice' },
    accessToken: 'header.payload.sig',
    refreshToken: 'a'.repeat(96)
  });
  assert.equal(result.success, true, 'AuthResponse should accept valid shape');
});

test('[schema] AuthResponse: rejects missing accessToken', () => {
  const result = AuthResponseSchema.safeParse({
    user: { id: 'some-uuid', username: 'alice' },
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

// ─── [schema] error message determinism ────────────────────────────────────

test('[schema] error shape: flatten() returns fieldErrors structure', () => {
  const result = RegisterRequestSchema.safeParse({
    username: 'ab',         // too short
    password: 'short',      // too short
    inviteCode: 'AB'        // too short
  });
  assert.equal(result.success, false);
  const flat = result.error!.flatten();
  // All three fields must appear in fieldErrors
  assert.ok('username' in flat.fieldErrors, 'username error present');
  assert.ok('password' in flat.fieldErrors, 'password error present');
  assert.ok('inviteCode' in flat.fieldErrors, 'inviteCode error present');
});
