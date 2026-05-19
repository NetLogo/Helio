import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import fp from 'fastify-plugin';
import { validateUUIDv4 } from '#src/shared/utils/validateUUIDv4.ts';

async function correlationIdPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('correlationId', '');

  fastify.addHook('onRequest', async (request, reply) => {
    const raw = request.headers['x-correlation-id'] as string | undefined;
    const id = raw && validateUUIDv4(raw) ? raw : randomUUID();
    request.correlationId = id;
    reply.header('x-correlation-id', id);
  });
}

export default fp(correlationIdPlugin, { name: 'correlationId' });

declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
  }
}
