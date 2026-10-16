import Fastify from 'fastify';
import fp from 'fastify-plugin';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { HEALTH_PATH } from '#src/shared/utils/consts.ts';

import rateLimitPlugin from '#src/server/plugins/rate-limit.ts';

const authStub = fp(
  async (fastify) => {
    fastify.decorateRequest('user', null);
  },
  { name: 'auth' },
);

describe('rateLimitPlugin', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(authStub);
    await fastify.register(rateLimitPlugin);
    fastify.get('/', async () => ({ ok: true }));
    fastify.get(HEALTH_PATH, async () => ({ ok: true }));
    await fastify.ready();
  });

  afterEach(async () => {
    await fastify.close();
  });

  it('counts an ordinary request against the limit', async () => {
    const response = await fastify.inject({ method: 'GET', url: '/' });

    expect(response.headers['x-ratelimit-limit']).toBeDefined();
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
  });

  it('does not count the health route', async () => {
    const response = await fastify.inject({ method: 'GET', url: HEALTH_PATH });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-ratelimit-limit']).toBeUndefined();
  });
});
