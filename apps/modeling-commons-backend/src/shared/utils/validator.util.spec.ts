import { idSchema } from '#src/shared/utils/id.ts';
import { addIdFormat } from '#src/shared/utils/validator.util.ts';
import Fastify from 'fastify';
import { Type } from 'typebox';
import { describe, expect, it } from 'vitest';

// Fastify compiles route schemas with an Ajv instance it builds itself, so a
// format registered only on the exported `ajv` never reaches route validation.
// Without addIdFormat wired into the server's ajv options every route carrying
// an idSchema fails to build and the app dies at boot.
describe('addIdFormat', () => {
  const buildWithRoute = (onCreate?: typeof addIdFormat) => {
    const fastify = Fastify({ ajv: { customOptions: { keywords: ['example'] }, onCreate } });
    fastify.route({
      method: 'PATCH',
      url: '/models/:id',
      schema: { params: Type.Object({ id: idSchema() }) },
      handler: async () => ({ ok: true }),
    });
    return fastify;
  };

  it('lets Fastify compile a route schema that uses idSchema', async () => {
    const fastify = buildWithRoute(addIdFormat);
    await expect(fastify.ready()).resolves.toBeDefined();
    await fastify.close();
  });

  it('fails to build the same route when the format is not registered', async () => {
    const fastify = buildWithRoute();
    await expect(fastify.ready()).rejects.toThrow(/unknown format "nanoid"/);
    await fastify.close();
  });

  it('accepts a nanoid and rejects a uuid through the compiled route', async () => {
    const fastify = buildWithRoute(addIdFormat);
    await fastify.ready();

    const ok = await fastify.inject({ method: 'PATCH', url: '/models/V1StGXR8Z5jdHi6BmyT8C' });
    expect(ok.statusCode).toBe(200);

    const bad = await fastify.inject({ method: 'PATCH', url: '/models/2cdc8ab1-6d50-49cc-ba14-54e4ac7ec231' });
    expect(bad.statusCode).toBe(400);

    await fastify.close();
  });
});
