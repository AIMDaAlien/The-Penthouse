import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerChatRoutes } from './routes/chats.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerMediaRoutes } from './routes/media.js';
import { registerMemberRoutes } from './routes/members.js';
import { registerPresenceRoutes } from './routes/presence.js';
import { registerUserRoutes } from './routes/users.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerDistributionRoutes } from './routes/distribution.js';
import { registerObservability } from './observability.js';
import { pool } from './db/pool.js';
import { getUserById, mapAuthUser } from './utils/users.js';
import { formatHttpErrorMessage } from './utils/error-responses.js';
import { ensureUploadsDirReady } from './utils/uploads.js';
import { recordServerError } from './utils/operatorDiagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp() {
  const app = Fastify({ logger: true, disableRequestLogging: true });
  const uploadsDir = await ensureUploadsDirReady();

  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_request, body, done) => {
    const rawBody = typeof body === 'string' ? body : body.toString('utf8');

    if (rawBody.trim().length === 0) {
      done(null, {});
      return;
    }

    try {
      done(null, JSON.parse(rawBody));
    } catch (error) {
      done(error as Error);
    }
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error && typeof error === 'object') {
      const code = 'code' in error ? String(error.code) : '';
      if (['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', '57P01'].includes(code)) {
        return reply.status(503).send({ error: 'Database unavailable' });
      }
    }

    const statusCode =
      typeof (error as { statusCode?: unknown })?.statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : 500;

    return reply
      .status(statusCode >= 400 && statusCode < 600 ? statusCode : 500)
      .send({ error: formatHttpErrorMessage(error, statusCode) });
  });

  app.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({ error: 'Route not found' });
  });

  app.addHook('onResponse', async (request, reply) => {
    if (reply.statusCode >= 500) {
      const routeUrl = request.routeOptions.url || request.raw.url;
      recordServerError(typeof routeUrl === 'string' ? routeUrl : undefined);
    }
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET
  });

  app.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Authorization token is missing or invalid' });
    }

    const tokenUser = request.user as { userId: string; username: string; sessionId?: string };
    const user = await getUserById(pool, tokenUser.userId);
    if (!user) {
      return reply.status(401).send({ error: 'Invalid user session' });
    }
    if (user.status !== 'active') {
      return reply.status(403).send({ error: 'Account unavailable' });
    }

    const authUser = mapAuthUser(user);
    request.user = {
      ...authUser,
      userId: user.id,
      sessionId: typeof tokenUser.sessionId === 'string' && tokenUser.sessionId ? tokenUser.sessionId : null,
      status: user.status
    } as any;
  });

  app.decorate('requireFullAccess', async (request, reply) => {
    if (request.user.mustChangePassword) {
      request.log.info({ userId: request.user.userId }, 'full access blocked: password change required');
      return reply.status(403).send({ error: 'Password change required' });
    }
    if (request.user.mustAcceptTestNotice) {
      request.log.info(
        {
          userId: request.user.userId,
          requiredVersion: request.user.requiredTestNoticeVersion,
          acceptedVersion: request.user.acceptedTestNoticeVersion
        },
        'full access blocked: test notice acknowledgement required'
      );
      return reply.status(403).send({ error: 'Test account acknowledgement required' });
    }
  });

  await app.register(multipart, {
    limits: {
      fileSize: env.UPLOAD_MAX_MB * 1024 * 1024
    }
  });

  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/'
  });

  registerObservability(app);

  await registerDistributionRoutes(app);
  await registerHealthRoutes(app);
  await registerAuthRoutes(app);
  await registerPresenceRoutes(app);
  await registerChatRoutes(app);
  await registerMemberRoutes(app);
  await registerUserRoutes(app);
  await registerAdminRoutes(app);
  await registerMediaRoutes(app);

  return app;
}
