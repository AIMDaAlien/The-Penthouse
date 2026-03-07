import { expect, test } from 'vitest';
import { describeAuthError } from './errors';

test('describeAuthError returns server string error', () => {
  const error = {
    isAxiosError: true,
    response: {
      status: 400,
      data: {
        error: 'Invalid or expired invite code'
      }
    }
  };

  expect(describeAuthError(error)).toBe('Invalid or expired invite code');
});

test('describeAuthError formats validation payloads', () => {
  const error = {
    isAxiosError: true,
    response: {
      status: 400,
      data: {
        error: {
          fieldErrors: {
            password: ['String must contain at least 10 character(s)']
          },
          formErrors: []
        }
      }
    }
  };

  expect(describeAuthError(error)).toBe(
    'Validation error: password: String must contain at least 10 character(s)'
  );
});

test('describeAuthError reports network target when API is unreachable', () => {
  const error = {
    isAxiosError: true,
    code: 'ERR_NETWORK'
  };

  expect(describeAuthError(error)).toContain('could not reach API');
});
