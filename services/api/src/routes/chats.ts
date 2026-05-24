import type { FastifyInstance } from 'fastify';
import { registerChatLifecycleRoutes } from './chat/lifecycle-routes.js';
import { registerChatListRoutes } from './chat/list-routes.js';
import { registerChatMemberRoutes } from './chat/member-routes.js';
import { registerChatMessageRoutes } from './chat/message-routes.js';
import { registerChatPinPreferenceRoutes } from './chat/pin-preference-routes.js';
import { registerChatPollRoutes } from './chat/poll-routes.js';
import { registerChatReadRoutes } from './chat/read-routes.js';

export async function registerChatRoutes(fastify: FastifyInstance) {
  await registerChatLifecycleRoutes(fastify);
  await registerChatMemberRoutes(fastify);
  await registerChatListRoutes(fastify);
  await registerChatMessageRoutes(fastify);
  await registerChatReadRoutes(fastify);
  await registerChatPollRoutes(fastify);
  await registerChatPinPreferenceRoutes(fastify);
}
