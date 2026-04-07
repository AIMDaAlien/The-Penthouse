import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CreateDirectChatRequestSchema,
  LoginRequestSchema
} from '@penthouse/contracts';
import {
  formatHttpErrorMessage,
  formatValidationError
} from '../src/utils/error-responses.js';

test('[errors] formatValidationError returns a readable string for invalid UUID fields', () => {
  const parsed = CreateDirectChatRequestSchema.safeParse({ memberId: 'not-a-uuid' });
  assert.equal(parsed.success, false);

  const message = formatValidationError(parsed.error);
  assert.equal(message, 'Member ID must be a valid ID');
});

test('[errors] formatValidationError combines common field validation failures into a flat string', () => {
  const parsed = LoginRequestSchema.safeParse({
    username: 'ab',
    password: 'short'
  });
  assert.equal(parsed.success, false);

  const message = formatValidationError(parsed.error);
  assert.equal(message, 'Username must be at least 3 characters; Password must be at least 10 characters');
});

test('[errors] formatHttpErrorMessage normalizes invalid JSON parser errors', () => {
  const message = formatHttpErrorMessage(
    { code: 'FST_ERR_CTP_INVALID_JSON_BODY', message: 'Unexpected token } in JSON at position 12' },
    400
  );

  assert.equal(message, 'Request body must be valid JSON');
});

test('[errors] formatHttpErrorMessage normalizes not-found responses', () => {
  const message = formatHttpErrorMessage(
    { code: 'FST_ERR_NOT_FOUND', message: 'Route GET:/missing not found' },
    404
  );

  assert.equal(message, 'Route not found');
});
