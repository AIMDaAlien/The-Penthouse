import axios from 'axios';
import { resolveApiBase } from './runtime';

type ValidationError = {
  fieldErrors?: Record<string, string[] | undefined>;
  formErrors?: string[];
};

type ApiErrorBody = {
  error?: string | ValidationError;
};

function formatValidationError(payload: ValidationError): string | null {
  const fieldMessages = Object.entries(payload.fieldErrors ?? {})
    .flatMap(([field, messages]) => (messages ?? []).map((message) => `${field}: ${message}`));

  const formMessages = payload.formErrors ?? [];
  const combined = [...formMessages, ...fieldMessages].filter(Boolean);

  if (!combined.length) return null;
  return `Validation error: ${combined.join(', ')}`;
}

export function describeAuthError(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const apiError = error.response?.data?.error;

    if (typeof apiError === 'string' && apiError.trim()) {
      return apiError;
    }

    if (apiError && typeof apiError === 'object') {
      const formatted = formatValidationError(apiError);
      if (formatted) return formatted;
    }

    if (error.code === 'ECONNABORTED') {
      return `Request timed out contacting API at ${resolveApiBase()}`;
    }

    if (error.code === 'ERR_NETWORK' || !error.response) {
      return `Network error: could not reach API at ${resolveApiBase()}`;
    }

    if (typeof error.response?.status === 'number') {
      return `API error (${error.response.status}) during authentication`;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Authentication failed';
}
