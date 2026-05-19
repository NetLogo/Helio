import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '#src/lib/auth.ts';
import { prisma } from '#src/lib/prisma.ts';
import { UnauthorizedException } from '#src/shared/exceptions/index.ts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import env from '#src/config/env.ts';

const SystemRole = {
  admin: 'admin',
  moderator: 'moderator',
  user: 'user',
} as const;
type SystemRole = (typeof SystemRole)[keyof typeof SystemRole];

const UserKind = {
  student: 'student',
  teacher: 'teacher',
  researcher: 'researcher',
  other: 'other',
} as const;
type UserKind = (typeof UserKind)[keyof typeof UserKind];

export type UserSession = {
  session: { id: string; userId: string; expiresAt: Date };
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    systemRole: SystemRole;
    userKind: UserKind;
    isProfilePublic: boolean;
    onboardedAt: Date | null;
    deletedAt: Date | null;
  };
};

class AuthService {
  async getSession(request: FastifyRequest): Promise<UserSession | null> {
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value) headers.append(key, Array.isArray(value) ? value.join(', ') : value);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const session = await auth.api.getSession({ headers });
    if (!session) return null;

    const dbUser = await prisma.user.findUnique({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      where: { id: session.user.id },
    });
    if (!dbUser) return null;

    if (dbUser.deletedAt) return null;

    return {
      session: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        id: session.session.id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        userId: session.session.userId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expiresAt: session.session.expiresAt,
      },
      user: {
        id: dbUser.id,
        name: dbUser.name ?? '',
        email: dbUser.email ?? '',
        image: dbUser.image,
        systemRole: dbUser.systemRole as SystemRole,
        userKind: dbUser.userKind as UserKind,
        isProfilePublic: dbUser.isProfilePublic,
        onboardedAt: dbUser.onboardedAt,
        deletedAt: dbUser.deletedAt,
      },
    };
  }

  async requireSession(request: FastifyRequest): Promise<UserSession> {
    const session = await this.getSession(request);
    if (!session) {
      throw new UnauthorizedException('Authentication required');
    }
    return session;
  }

  async revokeUserSessions(userId: string) {
    await prisma.session.deleteMany({ where: { userId } });
  }
}

async function authPlugin(fastify: FastifyInstance) {
  const authService = new AuthService();

  fastify.decorate('authService', authService);
  fastify.decorateRequest('user', null);
  fastify.decorateRequest('authSession', null);

  fastify.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    handler: async (request, reply) => {
      try {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const headers = fromNodeHeaders(request.headers);

        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        });

        const response = await auth.handler(req);

        reply.status(response.status);
        response.headers.forEach((value, key) => reply.header(key, value));
        reply.send(response.body ? await response.text() : null);
      } catch (error) {
        request.log.error(
          { name: 'AuthenticationError', error },
          'Error handling authentication request',
        );
        reply.status(500).send({ error: 'Internal Server Error', code: 'AUTH_ERROR' });
      }
    },
  });

  fastify.addHook('onRequest', async (request) => {
    if (request.url.startsWith('/api/auth/')) return;

    const session = await authService.getSession(request);
    request.user = session?.user ?? null;
    request.authSession = session?.session ?? null;
  });

  fastify.addHook('preHandler', async (request) => {
    if (
      env.isProduction &&
      (request.url.startsWith('/admin') || request.url.startsWith('/api-docs'))
    ) {
      const session = await authService.requireSession(request);
      if (session.user.systemRole !== SystemRole.admin) {
        throw new UnauthorizedException('Admin access required');
      }
    }
  });
}

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['correlationId'],
});

declare module 'fastify' {
  interface FastifyRequest {
    user: UserSession['user'] | null;
    authSession: UserSession['session'] | null;
  }
  interface FastifyInstance {
    authService: AuthService;
  }
}
