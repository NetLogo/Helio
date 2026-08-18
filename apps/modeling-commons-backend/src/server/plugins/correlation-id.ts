import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { newId } from '#src/shared/utils/id.ts';
import { validateRequestId } from '#src/shared/utils/validate-request-id.ts';

async function correlationIdPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('correlationId', '');

  fastify.addHook('onRequest', async (request, reply) => {
    const raw = request.headers['x-correlation-id'] as string | undefined;
    const id = raw && validateRequestId(raw) ? raw : newId();
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
