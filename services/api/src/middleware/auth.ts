import type { FastifyInstance } from 'fastify';
import { assertActiveSession } from '../utils/sessions.js';
import { AppError, unauthorized } from '../utils/error-responses.js';
import type { AuthContext } from '../types.js';

type JwtPayload = AuthContext & {
  iat: number;
  exp: number;
};

export async function registerAuth(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async (request, _reply) => {
    const auth = request.headers.authorization;
    const token = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) throw unauthorized();

    try {
      const payload = await fastify.jwt.verify<JwtPayload>(token);
      request.authUser = {
        userId: payload.userId,
        username: payload.username,
        sessionDeviceId: payload.sessionDeviceId,
        role: payload.role
      };
      await assertActiveSession(request.authUser);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Error && /expired/i.test(error.message)) {
        throw unauthorized('Access token expired; attempting refresh', 'ACCESS_TOKEN_EXPIRED');
      }
      throw unauthorized('Invalid access token', 'AUTH_INVALID');
    }
  });
}
