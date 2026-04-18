import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import { resolveModel } from '#src/shared/hooks/resolve-model.ts';
import type { FastifyInstance } from 'fastify';
import {
  additionalFileParamsSchema,
  listAdditionalFilesQuerySchema,
  type AdditionalFileParams,
  type ListAdditionalFilesQuery,
} from '#src/modules/model-additional-file/model-additional-file.schemas.ts';
import { modelAdditionalFileResponseDtoSchema } from '#src/modules/model-additional-file/dtos/model-additional-file.response.dto.ts';
import { modelIdParamsSchema, type ModelIdParams } from '#src/modules/model/dtos/model.dto.ts';
import type { ModelAdditionalFileEntity } from '#src/modules/model-additional-file/domain/model-additional-file.types.ts';
import { Type } from 'typebox';

export default async function modelAdditionalFileRoutes(fastify: FastifyInstance) {
  const { modelAdditionalFileService, fileService, listAdditionalFilesQuery } =
    fastify.diContainer.cradle;

  async function toResponse(entity: ModelAdditionalFileEntity) {
    const info = await fileService.getMetadata(entity.fileKey);
    const downloadUrl = await fileService.getUrl(entity.fileKey);
    return {
      id: entity.id,
      modelId: entity.modelId,
      taggedVersionNumber: entity.taggedVersionNumber,
      fileKey: entity.fileKey,
      filename: info.metadata.filename,
      contentType: info.contentType,
      sizeBytes: Number(info.sizeBytes),
      createdAt: entity.createdAt.toISOString(),
      downloadUrl,
    };
  }

  fastify.post<{ Params: ModelIdParams }>(
    '/v1/models/:id/additional-files',
    {
      schema: {
        params: modelIdParamsSchema,
        response: { 201: modelAdditionalFileResponseDtoSchema },
        tags: ['Model', 'File'],
        description:
          'Upload an additional file for a model. The file is sent as multipart/form-data with the file field named "file".',
      },
      preHandler: [requireAuth, resolveModel('write')],
    },
    async (request, reply) => {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ message: 'File upload required' });
      }

      const buffer = await data.toBuffer();
      const ownBuffer = Buffer.alloc(buffer.length);
      buffer.copy(ownBuffer);
      buffer.fill(0);

      const entity = await modelAdditionalFileService.add(
        request.params.id,
        request.user!.id,
        ownBuffer,
        data.filename,
        data.mimetype,
      );

      return reply.code(201).send(await toResponse(entity));
    },
  );

  fastify.delete<{ Params: AdditionalFileParams }>(
    '/v1/models/:id/additional-files/:fileId',
    {
      schema: {
        params: additionalFileParamsSchema,
        tags: ['Model', 'File'],
      },
      preHandler: [requireAuth, resolveModel('admin')],
    },
    async (request, reply) => {
      await modelAdditionalFileService.remove(request.params.fileId, request.user!.id);
      return reply.code(204).send();
    },
  );

  fastify.get<{ Params: ModelIdParams; Querystring: ListAdditionalFilesQuery }>(
    '/v1/models/:id/additional-files',
    {
      schema: {
        params: modelIdParamsSchema,
        querystring: listAdditionalFilesQuerySchema,
        response: { 200: Type.Array(modelAdditionalFileResponseDtoSchema) },
        tags: ['Model', 'File'],
      },
      preHandler: [resolveModel('read')],
    },
    async (request) => {
      const entities = await listAdditionalFilesQuery.execute(
        request.params.id,
        request.query.taggedVersionNumber,
      );
      return Promise.all(entities.map(toResponse));
    },
  );
}
