import env from '#src/config/env.ts';
import type { FastifyInstance } from 'fastify';

export default async function previewImageRoutes(fastify: FastifyInstance) {
  const { previewImageService } = fastify.diContainer.cradle;

  fastify.get('/v1/dev/fill-in', async (_, reply) => {
    if (env.isProduction) return reply.code(404).send({ error: 'Not found' });
    const report = await previewImageService.fillInPreviewImages();
    return reply.code(200).send(report);
  });
}
