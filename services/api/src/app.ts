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
import { registerAdminRoutes } from './routes/admin.js';
import { registerObservability } from './observability.js';
import { pool } from './db/pool.js';
import { getUserById, mapAuthUser } from './utils/users.js';
import { ensureUploadsDirReady } from './utils/uploads.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp() {
  const app = Fastify({ logger: true, disableRequestLogging: true });
  const uploadsDir = await ensureUploadsDirReady();

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error && typeof error === 'object') {
      const code = 'code' in error ? String(error.code) : '';
      if (['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', '57P01'].includes(code)) {
        return reply.status(503).send({ error: 'Database unavailable' });
      }
    }

    return reply.status(500).send({ error: 'Internal server error' });
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
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const tokenUser = request.user as { userId: string; username: string };
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

  await registerHealthRoutes(app);
  await registerAuthRoutes(app);
  await registerChatRoutes(app);
  await registerMemberRoutes(app);
  await registerAdminRoutes(app);
  await registerMediaRoutes(app);

  return app;
}
