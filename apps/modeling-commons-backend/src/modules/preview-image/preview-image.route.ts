import type { FastifyInstance } from 'fastify';

export default async function previewImageRoutes(fastify: FastifyInstance) {
  const { previewImageService } = fastify.diContainer.cradle;

  fastify.get('/v1/dev/fill-in', async (request, reply) => {
    const report = await previewImageService.fillInPreviewImages();
    return reply.code(200).send(report);
  });
}
