import Fastify from 'fastify';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { ID_PATTERN } from '#src/shared/utils/id.ts';

import correlationIdPlugin from '#src/server/plugins/correlation-id.ts';

describe('correlationIdPlugin', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(correlationIdPlugin);
    fastify.get('/', async (request) => ({ correlationId: request.correlationId }));
    await fastify.ready();
  });

  afterEach(async () => {
    await fastify.close();
  });

  it('generates a NanoID when no header is sent', async () => {
    const response = await fastify.inject({ method: 'GET', url: '/' });

    expect(response.headers['x-correlation-id']).toMatch(new RegExp(ID_PATTERN));
    expect(response.json().correlationId).toBe(response.headers['x-correlation-id']);
  });

  it('echoes back a valid UUID header unchanged', async () => {
    const uuid = '2cdc8ab1-6d50-49cc-ba14-54e4ac7ec231';
    const response = await fastify.inject({ method: 'GET', url: '/', headers: { 'x-correlation-id': uuid } });

    expect(response.headers['x-correlation-id']).toBe(uuid);
  });

  it('echoes back a valid NanoID header unchanged', async () => {
    const nanoid = 'A1b2C3d4E5f6G7h8I9j0K';
    const response = await fastify.inject({ method: 'GET', url: '/', headers: { 'x-correlation-id': nanoid } });

    expect(response.headers['x-correlation-id']).toBe(nanoid);
  });

  it('generates a fresh id when the header is malformed', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/',
      headers: { 'x-correlation-id': 'not-a-real-id' },
    });

    expect(response.headers['x-correlation-id']).toMatch(new RegExp(ID_PATTERN));
  });

  it('generates a fresh id when the header is over-long', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/',
      headers: { 'x-correlation-id': 'a'.repeat(1000) },
    });

    expect(response.headers['x-correlation-id']).toMatch(new RegExp(ID_PATTERN));
  });
});
