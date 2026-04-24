import { LimitExceededException } from '#src/shared/exceptions/exceptions.ts';
import { getClientIp } from '#src/shared/http/client-context.ts';
import RateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

async function rateLimitPlugin(fastify: FastifyInstance) {
  await fastify.register(RateLimit, {
    max: (request) => (request.user ? 500 : 120),
    timeWindow: '10 seconds',
    keyGenerator: (request) => request.user?.id ?? getClientIp(request),
    errorResponseBuilder: (_, context) => {
      return new LimitExceededException(
        `Rate limit exceeded, retry after ${Math.round(context.ttl / 1000)} seconds`,
      );
    },
  });
}

export default fp(rateLimitPlugin, {
  name: 'rateLimit',
  dependencies: ['auth'],
});
