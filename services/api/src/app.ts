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
import { avatarUrlFromFileName, getUserById } from './utils/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp() {
  const app = Fastify({ logger: true, disableRequestLogging: true });

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

    request.user = {
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: avatarUrlFromFileName(user.avatar_storage_key),
      role: user.role,
      status: user.status,
      mustChangePassword: user.must_change_password
    } as any;
  });

  app.decorate('requireFullAccess', async (request, reply) => {
    if (request.user.mustChangePassword) {
      return reply.status(403).send({ error: 'Password change required' });
    }
  });

  await app.register(multipart, {
    limits: {
      fileSize: env.UPLOAD_MAX_MB * 1024 * 1024
    }
  });

  await app.register(fastifyStatic, {
    root: path.join(__dirname, '../uploads'),
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
