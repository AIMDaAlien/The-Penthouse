import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError, type ZodIssue } from 'zod';
import { recordServerError } from './operatorDiagnostics.js';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function badRequest(message: string, code = 'VALIDATION_ERROR') {
  return new AppError(code, 400, message);
}

export function unauthorized(message = 'Authentication required', code = 'AUTH_REQUIRED') {
  return new AppError(code, 401, message);
}

export function forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
  return new AppError(code, 403, message);
}

export function notFound(message = 'Not found', code = 'NOT_FOUND') {
  return new AppError(code, 404, message);
}

function humanizeField(path: Array<string | number>) {
  const field = String(path.at(-1) ?? 'Field');
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^id$/i, 'ID')
    .replace(/\bid\b/gi, 'ID')
    .replace(/^./, (char) => char.toUpperCase());
}

export function formatValidationError(error: ZodError) {
  return error.issues
    .map((issue) => `${humanizeField(issue.path)} ${formatZodIssueMessage(issue)}`)
    .join('; ');
}

function formatZodIssueMessage(issue: ZodIssue) {
  if (issue.code === 'invalid_string' && issue.validation === 'uuid') return 'must be a valid ID';
  if (issue.code === 'too_small' && issue.type === 'string') {
    return `must be at least ${issue.minimum} characters`;
  }
  return issue.message.replace(/^String /, '');
}

export function formatHttpErrorMessage(error: { code?: string; message?: string }, statusCode: number) {
  if (statusCode === 400 && error.code === 'FST_ERR_CTP_INVALID_JSON_BODY') {
    return 'Request body must be valid JSON';
  }
  if (statusCode === 404 && error.code === 'FST_ERR_NOT_FOUND') {
    return 'Route not found';
  }
  return error.message ?? 'Request failed';
}

export async function errorHandler(error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      code: 'VALIDATION_ERROR',
      message: error.issues[0]?.message ?? 'Validation failed',
      status: 400
    });
  }

  if (error instanceof AppError) {
    return reply.status(error.status).send({
      code: error.code,
      message: error.message,
      status: error.status
    });
  }

  request.log.error({ err: error }, 'request failed');
  recordServerError(request.url);
  return reply.status(500).send({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
    status: 500
  });
}
