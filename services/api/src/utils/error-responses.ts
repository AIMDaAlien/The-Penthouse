import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

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
  return reply.status(500).send({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
    status: 500
  });
}
