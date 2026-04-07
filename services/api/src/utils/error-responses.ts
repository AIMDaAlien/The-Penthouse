import type { ZodError, ZodIssue } from 'zod';

const FIELD_LABELS: Record<string, string> = {
  acceptTestNotice: 'Test notice acknowledgement',
  avatarMediaId: 'Avatar media ID',
  avatarUploadId: 'Avatar upload ID',
  chatId: 'Chat ID',
  clientMessageId: 'Client message ID',
  displayName: 'Display name',
  expiresAt: 'Expires at',
  inviteCode: 'Invite code',
  maxUses: 'Max uses',
  memberId: 'Member ID',
  newPassword: 'New password',
  notificationsMuted: 'Notifications muted',
  password: 'Password',
  previousToken: 'Previous token',
  q: 'Search query',
  quietHoursEndMinute: 'Quiet hours end minute',
  quietHoursStartMinute: 'Quiet hours start minute',
  recoveryCode: 'Recovery code',
  refreshToken: 'Refresh token',
  testNoticeVersion: 'Test notice version',
  userId: 'User ID'
};

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

function humanizeFieldSegment(segment: string): string {
  const mapped = FIELD_LABELS[segment];
  if (mapped) return mapped;

  return segment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word.toLowerCase() === 'id') return 'ID';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function humanizeFieldPath(path: Array<string | number>): string {
  return path
    .map((segment) => {
      if (typeof segment === 'number') return `Item ${segment + 1}`;
      return humanizeFieldSegment(segment);
    })
    .join(' ')
    .trim();
}

function formatEnumOptions(options: readonly (string | number)[]): string {
  return options.map((option) => String(option)).join(', ');
}

function formatValidationIssue(issue: ZodIssue): string {
  const field = humanizeFieldPath(issue.path);

  switch (issue.code) {
    case 'invalid_type':
      if (issue.received === 'undefined') {
        return field ? `${field} is required` : 'Required';
      }
      return field ? `${field} has an invalid value` : 'Invalid value';

    case 'too_small':
      if (issue.type === 'string') {
        const minimum = Number(issue.minimum);
        if (issue.minimum === 1) {
          return field ? `${field} is required` : 'Required';
        }
        return field
          ? `${field} must be at least ${minimum} ${pluralize(minimum, 'character')}`
          : `Must be at least ${minimum} ${pluralize(minimum, 'character')}`;
      }
      if (issue.type === 'number') {
        const minimum = Number(issue.minimum);
        return field
          ? `${field} must be at least ${minimum}`
          : `Must be at least ${minimum}`;
      }
      if (issue.type === 'array') {
        const minimum = Number(issue.minimum);
        return field
          ? `${field} must include at least ${minimum} ${pluralize(minimum, 'item')}`
          : `Must include at least ${minimum} ${pluralize(minimum, 'item')}`;
      }
      return issue.message || 'Value is too small';

    case 'too_big':
      if (issue.type === 'string') {
        const maximum = Number(issue.maximum);
        return field
          ? `${field} must be at most ${maximum} ${pluralize(maximum, 'character')}`
          : `Must be at most ${maximum} ${pluralize(maximum, 'character')}`;
      }
      if (issue.type === 'number') {
        const maximum = Number(issue.maximum);
        return field
          ? `${field} must be at most ${maximum}`
          : `Must be at most ${maximum}`;
      }
      if (issue.type === 'array') {
        const maximum = Number(issue.maximum);
        return field
          ? `${field} must include at most ${maximum} ${pluralize(maximum, 'item')}`
          : `Must include at most ${maximum} ${pluralize(maximum, 'item')}`;
      }
      return issue.message || 'Value is too large';

    case 'invalid_string':
      if (issue.validation === 'uuid') {
        return field ? `${field} must be a valid ID` : 'Value must be a valid ID';
      }
      if (issue.validation === 'datetime') {
        return issue.message || (field ? `${field} must be a valid datetime` : 'Value must be a valid datetime');
      }
      return issue.message || (field ? `${field} is invalid` : 'Value is invalid');

    case 'invalid_enum_value':
      return field
        ? `${field} must be one of: ${formatEnumOptions(issue.options)}`
        : `Value must be one of: ${formatEnumOptions(issue.options)}`;

    case 'invalid_literal':
      return field ? `${field} must be ${String(issue.expected)}` : `Value must be ${String(issue.expected)}`;

    case 'custom':
      return issue.message || 'Invalid value';

    default:
      return issue.message || 'Request validation failed';
  }
}

export function formatValidationError(error: ZodError, maxIssues = 3): string {
  const messages = error.issues
    .map((issue) => formatValidationIssue(issue))
    .filter((message, index, all) => Boolean(message) && all.indexOf(message) === index)
    .slice(0, maxIssues);

  return messages.join('; ') || 'Request validation failed';
}

export function formatHttpErrorMessage(error: unknown, statusCode: number): string {
  const errorLike = error as {
    code?: unknown;
    message?: unknown;
    validation?: unknown;
  } | null;
  const code = typeof errorLike?.code === 'string' ? errorLike.code : '';
  const message = typeof errorLike?.message === 'string' ? errorLike.message.trim() : '';

  if (code === 'FST_ERR_CTP_EMPTY_JSON_BODY') {
    return 'Request body is required';
  }

  if (code === 'FST_ERR_CTP_INVALID_JSON_BODY' || error instanceof SyntaxError) {
    return 'Request body must be valid JSON';
  }

  if (code === 'FST_REQ_FILE_TOO_LARGE' || statusCode === 413) {
    return 'File too large';
  }

  if (statusCode === 404 || code === 'FST_ERR_NOT_FOUND') {
    return 'Route not found';
  }

  if (statusCode === 415) {
    return message || 'Unsupported media type';
  }

  if (statusCode >= 400 && statusCode < 500) {
    if (message) return message;
    if (Array.isArray(errorLike?.validation) && errorLike.validation.length > 0) {
      return 'Request validation failed';
    }
    return 'Request failed';
  }

  if (statusCode === 503) {
    return 'Database unavailable';
  }

  return 'Internal server error';
}
