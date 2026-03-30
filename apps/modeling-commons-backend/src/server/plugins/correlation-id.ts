import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import fp from 'fastify-plugin';

async function correlationIdPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('correlationId', '');

  fastify.addHook('onRequest', async (request, reply) => {
    const id = (request.headers['x-correlation-id'] as string | undefined) ?? randomUUID();
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
