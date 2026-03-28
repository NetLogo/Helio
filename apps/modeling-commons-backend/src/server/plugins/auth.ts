import { auth } from '#src/lib/auth.ts';
import { prisma } from '#src/lib/prisma.ts';
import { UnauthorizedException } from '#src/shared/exceptions/index.ts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

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
    deletedAt: Date | null;
  };
};

class AuthService {
  async getSession(request: FastifyRequest): Promise<UserSession | null> {
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value) headers.append(key, Array.isArray(value) ? value.join(', ') : value);
    }

    const session = await auth.api.getSession({ headers });
    if (!session) return null;

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!dbUser) return null;

    if (dbUser.deletedAt) return null;

    return {
      session: {
        id: session.session.id,
        userId: session.session.userId,
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
}

async function authPlugin(fastify: FastifyInstance) {
  const authService = new AuthService();

  fastify.decorate('authService', authService);
  fastify.decorateRequest('user', null);

  fastify.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    handler: async (request, reply) => {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const headers = new Headers();
      for (const [key, value] of Object.entries(request.headers)) {
        if (value) headers.append(key, Array.isArray(value) ? value.join(', ') : value);
      }

      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      });

      const response = await auth.handler(req);
      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.send(response.body ? await response.text() : null);
    },
  });

  fastify.addHook('onRequest', async (request) => {
    if (request.url.startsWith('/api/auth/')) return;

    const session = await authService.getSession(request);
    request.user = session?.user ?? null;
  });
}

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['correlationId'],
});

declare module 'fastify' {
  interface FastifyRequest {
    user: UserSession['user'] | null;
  }
  interface FastifyInstance {
    authService: AuthService;
  }
}
