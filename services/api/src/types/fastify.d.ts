import '@fastify/jwt';
import type { UserRole, UserStatus } from '@penthouse/contracts';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      username: string;
    };
    user: {
      userId: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      role: UserRole;
      status: UserStatus;
      mustChangePassword: boolean;
    };
  }
}
