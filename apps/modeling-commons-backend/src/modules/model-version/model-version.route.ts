import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import { resolveModel } from '#src/shared/hooks/resolve-model.ts';
import type { FastifyInstance } from 'fastify';
import {
  createVersionRequestDtoSchema,
  updateCurrentVersionRequestDtoSchema,
  versionParamsSchema,
  type CreateVersionRequestDto,
  type UpdateCurrentVersionRequestDto,
  type VersionParams,
} from '#src/modules/model-version/model-version.schemas.ts';
import { modelVersionResponseDtoSchema } from '#src/modules/model-version/dtos/model-version.response.dto.ts';
import { modelVersionCardResponseDtoSchema } from '#src/modules/model-version/dtos/model-version.card.dto.ts';
import { modelVersionPaginatedResponseSchema } from '#src/modules/model-version/dtos/model-version.paginated.response.dto.ts';
import { paginatedQueryRequestDtoSchema } from '#src/shared/api/paginated-query.request.dto.ts';
import { Type } from 'typebox';
import { modelIdParamsSchema, type ModelIdParams } from '#src/modules/model/dtos/model.dto.ts';
import { resolveFile } from '#src/shared/hooks/resolve-file.ts';

export default async function modelVersionRoutes(fastify: FastifyInstance) {
  const {
    modelVersionService,
    modelVersionMapper,
    listVersionsQuery,
    getVersionQuery,
    getVersionCardQuery,
  } = fastify.diContainer.cradle;

  fastify.post<{ Params: ModelIdParams }>(
    '/v1/models/:id/versions',
    {
      schema: {
        params: modelIdParamsSchema,
        response: { 201: Type.Object({ versionNumber: Type.Integer() }) },
        tags: ['Model'],
        consumes: ['multipart/form-data'],
        description:
          'Create a new model version. Send as multipart/form-data with a required "file" field (the .nlogox) plus optional "title" and "description" text fields.',
      },
      preHandler: [
        requireAuth,
        resolveModel('write'),
        resolveFile({ fieldsSchema: createVersionRequestDtoSchema }),
      ],
    },
    async (request, reply) => {
      const { buffer, filename, mimetype } = request.uploadedFile;
      const { title, description } = request.uploadedFile.values as CreateVersionRequestDto;

      const versionNumber = await modelVersionService.create(
        request.params.id,
        request.user!.id,
        { buffer: buffer as Buffer<ArrayBuffer>, filename, contentType: mimetype },
        { title, description },
      );
      return reply.code(201).send({ versionNumber });
    },
  );

  fastify.patch<{ Params: ModelIdParams; Body: UpdateCurrentVersionRequestDto }>(
    '/v1/models/:id/versions/current',
    {
      schema: {
        params: modelIdParamsSchema,
        body: updateCurrentVersionRequestDtoSchema,
        tags: ['Model'],
      },
      preHandler: [requireAuth, resolveModel('write')],
    },
    async (request, reply) => {
      await modelVersionService.updateCurrent(request.params.id, request.user!.id, request.body);
      return reply.code(204).send();
    },
  );

  fastify.get<{ Params: ModelIdParams; Querystring: { limit?: number; page?: number } }>(
    '/v1/models/:id/versions',
    {
      schema: {
        params: modelIdParamsSchema,
        querystring: paginatedQueryRequestDtoSchema,
        response: { 200: modelVersionPaginatedResponseSchema },
        tags: ['Model'],
      },
      preHandler: [resolveModel('read')],
    },
    async (request) => {
      const result = await listVersionsQuery.execute(request.params.id, request.query);
      return {
        ...result,
        data: result.data.map((e) => modelVersionMapper.toResponse(e)),
      };
    },
  );

  fastify.get<{ Params: VersionParams }>(
    '/v1/models/:id/versions/:version',
    {
      schema: {
        params: versionParamsSchema,
        response: { 200: modelVersionResponseDtoSchema },
        tags: ['Model'],
      },
      preHandler: [resolveModel('read')],
    },
    async (request) => {
      const entity = await getVersionQuery.execute(request.params.id, request.params.version);
      return modelVersionMapper.toResponse(entity);
    },
  );

  fastify.get<{ Params: VersionParams }>(
    '/v1/models/:id/versions/:version/card',
    {
      schema: {
        params: versionParamsSchema,
        response: { 200: modelVersionCardResponseDtoSchema },
        tags: ['Model'],
      },
      preHandler: [resolveModel('read')],
    },
    async (request) => {
      return getVersionCardQuery.execute(request.params.id, request.params.version);
    },
  );

}
