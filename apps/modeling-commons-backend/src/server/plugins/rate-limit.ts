import RateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

async function rateLimitPlugin(fastify: FastifyInstance) {
  await fastify.register(RateLimit, {
    max: (request) => (request.user ? 120 : 60),
    timeWindow: '1 minute',
    keyGenerator: (request) => request.user?.id ?? request.ip,
  });
}

export default fp(rateLimitPlugin, {
  name: 'rateLimit',
  dependencies: ['auth'],
});
