const USERNAME_PATTERN = /^[a-z0-9_@.-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export const AUTH_COPY = {
  username: '3-20 chars; letters, numbers, _, @, ., -',
  password: 'Min 8 chars with uppercase, lowercase, number, and symbol',
};

export function isValidUsername(value: string): boolean {
  return value.length >= 3 && value.length <= 20 && USERNAME_PATTERN.test(value);
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

export function getPasswordValidationError(value: string): string | null {
  if (value.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!PASSWORD_PATTERN.test(value)) {
    return 'Password must include uppercase, lowercase, number, and symbol';
  }
  return null;
}

