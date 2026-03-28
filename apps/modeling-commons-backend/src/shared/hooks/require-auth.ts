import { UnauthorizedException } from '#src/shared/exceptions/index.ts';
import type { FastifyReply, FastifyRequest } from 'fastify';

export async function requireAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  if (!request.user) {
    throw new UnauthorizedException('Authentication required');
  }
}
