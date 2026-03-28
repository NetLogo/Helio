import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

async function requestLoggerPlugin(fastify: FastifyInstance) {
  fastify.addHook('onResponse', async (request, reply) => {
    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
      correlationId: request.correlationId,
      userId: (request as { user?: { id: string } }).user?.id ?? 'anonymous',
    });
  });
}

export default fp(requestLoggerPlugin, {
  name: 'requestLogger',
  dependencies: ['correlationId'],
});
