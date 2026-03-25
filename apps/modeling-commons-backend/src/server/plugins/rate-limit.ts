import env from '#src/config/env.ts';
import { LimitExceededException } from '#src/shared/exceptions/exceptions.ts';
import RateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

async function rateLimitPlugin(fastify: FastifyInstance) {
  await fastify.register(RateLimit, {
    max: (request) => (request.user ? 500 : 120),
    timeWindow: '10 seconds',
    keyGenerator: (request) =>
      [
        request.user?.id,
        ...env.server.ipAddressHeaders.map(
          (header) => request.headers[header] as string | undefined,
        ),
      ].reduce((acc, val) => acc ?? val, undefined) ?? request.ip,
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
