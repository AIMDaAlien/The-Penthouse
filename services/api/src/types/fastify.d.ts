import '@fastify/jwt';
import type { UserRole, UserStatus } from '@penthouse/contracts';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      username: string;
      sessionDeviceId: string | null;
      role: UserRole;
    };
    user: {
      userId: string;
      sessionId: string | null;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      timezone?: string | null;
      role: UserRole;
      status: UserStatus;
      mustChangePassword: boolean;
      mustAcceptTestNotice: boolean;
      requiredTestNoticeVersion: string;
      acceptedTestNoticeVersion: string | null;
    };
  }
}
