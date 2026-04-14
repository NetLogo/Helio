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
import { modelVersionPaginatedResponseSchema } from '#src/modules/model-version/dtos/model-version.paginated.response.dto.ts';
import { paginatedQueryRequestDtoSchema } from '#src/shared/api/paginated-query.request.dto.ts';
import { Type } from 'typebox';
import { modelIdParamsSchema, type ModelIdParams } from '#src/modules/model/model.schemas.ts';

export default async function modelVersionRoutes(fastify: FastifyInstance) {
  const { modelVersionService, modelVersionMapper, listVersionsQuery, getVersionQuery } =
    fastify.diContainer.cradle;

  fastify.post<{ Params: ModelIdParams; Body: CreateVersionRequestDto }>(
    '/v1/models/:id/versions',
    {
      schema: {
        params: modelIdParamsSchema,
        body: createVersionRequestDtoSchema,
        response: { 201: Type.Object({ versionNumber: Type.Integer() }) },
        tags: ['Model'],
      },
      preHandler: [requireAuth, resolveModel('write')],
    },
    async (request, reply) => {
      const versionNumber = await modelVersionService.create(
        request.params.id,
        request.user!.id,
        { buffer: Buffer.alloc(0), filename: '', contentType: 'application/octet-stream' },
        request.body,
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
    '/v1/models/:id/versions/:version/preview-image',
    {
      schema: {
        params: versionParamsSchema,
        response: {
          200: Type.String({ format: 'binary' }),
        },
        tags: ['Model'],
      },
      preHandler: [resolveModel('read')],
    },
    async (request, reply) => {
      const { buffer, contentType } = await modelVersionService.getPreviewImage(
        request.params.id,
        request.params.version,
      );
      reply.header('Content-Type', contentType);
      reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
      return buffer;
    },
  );
}
