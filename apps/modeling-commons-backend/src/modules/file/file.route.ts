import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import type { FastifyInstance } from 'fastify';
import { fileIdParamsSchema, type FileIdParams } from '#src/modules/file/file.schemas.ts';
import { fileResponseDtoSchema } from '#src/modules/file/dtos/file.response.dto.ts';

export default async function fileRoutes(fastify: FastifyInstance) {
  const { fileService, fileMapper } = fastify.diContainer.cradle;

  fastify.get<{ Params: FileIdParams }>(
    '/v1/files/:id',
    {
      schema: {
        params: fileIdParamsSchema,
        response: { 200: fileResponseDtoSchema },
        tags: ['File'],
      },
      preHandler: [requireAuth],
    },
    async (request) => {
      const metadata = await fileService.getMetadata(request.params.id);
      return fileMapper.toResponse({ ...metadata, blob: Buffer.alloc(0) });
    },
  );

  fastify.get<{ Params: FileIdParams }>(
    '/v1/files/:id/download',
    {
      schema: { params: fileIdParamsSchema, tags: ['File'] },
      // TODO: File Permissions Access Control
      // preHandler: [requireAuth],
    },
    async (request, reply) => {
      const file = await fileService.download(request.params.id);
      reply.header('content-type', file.contentType);
      reply.header('content-disposition', `attachment; filename="${file.filename}"`);
      return reply.send(file.blob);
    },
  );
}
