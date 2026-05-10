import type { FastifyRequest } from 'fastify';
import type { Server } from 'socket.io';

export type AuthContext = {
  userId: string;
  username: string;
  sessionDeviceId: string | null;
  role: 'admin' | 'member';
};

export type AuthedRequest = FastifyRequest & {
  authUser: AuthContext;
};

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>;
    io: Server;
  }

  interface FastifyRequest {
    authUser?: AuthContext;
  }
}
