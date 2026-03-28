import { ForbiddenException } from '#src/shared/exceptions/index.ts';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';

const SystemRole = {
  admin: 'admin',
  moderator: 'moderator',
  user: 'user',
} as const;
type SystemRole = (typeof SystemRole)[keyof typeof SystemRole];

export function requireRole(...roles: SystemRole[]): preHandlerHookHandler {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const userRole = request.user?.systemRole;
    if (!userRole || !roles.includes(userRole as SystemRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  };
}
