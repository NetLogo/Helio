import Fastify from 'fastify';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { HEALTH_PATH } from '#src/shared/utils/consts.ts';
import { TRACKING_COOKIE_NAME } from '#src/shared/http/client-context.ts';

import trackingCookiePlugin from '#src/server/plugins/tracking-cookie.ts';

describe('trackingCookiePlugin', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(trackingCookiePlugin);
    fastify.get('/', async () => ({ ok: true }));
    fastify.get(HEALTH_PATH, async () => ({ ok: true }));
    await fastify.ready();
  });

  afterEach(async () => {
    await fastify.close();
  });

  it('sets the tracking cookie on an ordinary request', async () => {
    const response = await fastify.inject({ method: 'GET', url: '/' });

    expect(String(response.headers['set-cookie'])).toContain(`${TRACKING_COOKIE_NAME}=`);
  });

  it('leaves the health route alone', async () => {
    const response = await fastify.inject({ method: 'GET', url: HEALTH_PATH });

    expect(response.headers['set-cookie']).toBeUndefined();
  });
});
