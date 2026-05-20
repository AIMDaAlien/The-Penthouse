import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import Fastify from 'fastify';
import { Server } from 'socket.io';
import { env } from './config/env.js';
import { errorHandler } from './utils/error-responses.js';
import { registerAuth } from './middleware/auth.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerChatRoutes } from './routes/chats.js';
import { registerDistributionRoutes } from './routes/distribution.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerMediaRoutes } from './routes/media.js';
import { registerPushRoutes } from './routes/push.js';
import { registerSyncRoutes } from './routes/sync.js';
import { registerUserRoutes } from './routes/users.js';
import { registerPresenceRoutes } from './routes/presence.js';
import { registerSocket } from './realtime/socket.js';
import { mediasoupRooms, validateMediasoupConfig } from './realtime/mediasoup.js';
import { registerPushHandlers } from './features/push/handlers.js';
import { registerCustomEmoteRoutes } from './features/customEmotes/routes.js';
import { registerGifRoutes } from './features/gifs/routes.js';
import { registerChatFolderRoutes } from './features/chatFolders/routes.js';
import { registerChannelRoutes } from './features/channels/routes.js';

export async function buildApp() {
  validateMediasoupConfig();

  const fastify = Fastify({
    logger: env.NODE_ENV === 'test' ? false : true,
    trustProxy: env.TRUST_PROXY
  });

  await fastify.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true
  });
  await fastify.register(jwt, { secret: env.JWT_SECRET });
  await fastify.register(multipart, {
    limits: {
      files: 3,
      fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024
    }
  });

  await registerAuth(fastify);
  fastify.setErrorHandler(errorHandler);

  await registerHealthRoutes(fastify);
  await registerAuthRoutes(fastify);
  await registerDistributionRoutes(fastify);
  await registerAdminRoutes(fastify);
  await registerUserRoutes(fastify);
  await registerPresenceRoutes(fastify);
  await registerChatRoutes(fastify);
  await registerPushRoutes(fastify);
  await registerSyncRoutes(fastify);
  await registerMediaRoutes(fastify);
  await registerCustomEmoteRoutes(fastify);
  await registerGifRoutes(fastify);
  await registerChatFolderRoutes(fastify);
  await registerChannelRoutes(fastify);

  const io = new Server(fastify.server, {
    cors: {
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
      credentials: true
    }
  });
  fastify.decorate('io', io);
  registerSocket(io, fastify);
  const unregisterPushHandlers = registerPushHandlers(io);

  fastify.addHook('onClose', async () => {
    unregisterPushHandlers();
    await mediasoupRooms.close();
    io.close();
  });

  return fastify;
}

export const createApp = buildApp;
