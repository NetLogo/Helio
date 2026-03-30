import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import { resolveModel } from '#src/shared/hooks/resolve-model.ts';
import type { FastifyInstance } from 'fastify';
import {
  createModelRequestDtoSchema,
  modelIdParamsSchema,
  modelSearchQuerySchema,
  updateModelRequestDtoSchema,
  type CreateModelRequestDto,
  type ModelIdParams,
  type ModelSearchQuery,
  type UpdateModelRequestDto,
} from '#src/modules/model/model.schemas.ts';
import { modelResponseDtoSchema } from '#src/modules/model/dtos/model.response.dto.ts';
import { modelPaginatedResponseSchema } from '#src/modules/model/dtos/model.paginated.response.dto.ts';
import { idDtoSchema } from '#src/shared/api/id.response.dto.ts';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

export default async function modelRoutes(fastify: FastifyInstance) {
  const { modelService, modelMapper, searchModelsQuery, getModelChildrenQuery } =
    fastify.diContainer.cradle;

  fastify.post<{ Body: CreateModelRequestDto }>(
    '/v1/models',
    {
      schema: {
        body: createModelRequestDtoSchema,
        response: { 201: idDtoSchema },
        tags: ['Model'],
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const id = await modelService.create(request.user!.id, request.body);
      return reply.code(201).send({ id });
    },
  );

  fastify.patch<{ Params: ModelIdParams; Body: UpdateModelRequestDto }>(
    '/v1/models/:id',
    {
      schema: {
        params: modelIdParamsSchema,
        body: updateModelRequestDtoSchema,
        tags: ['Model'],
      },
      preHandler: [requireAuth, resolveModel('write')],
    },
    async (request, reply) => {
      await modelService.update(request.params.id, request.body);
      return reply.code(204).send();
    },
  );

  fastify.delete<{ Params: ModelIdParams }>(
    '/v1/models/:id',
    {
      schema: { params: modelIdParamsSchema, tags: ['Model'] },
      preHandler: [requireAuth, resolveModel('admin')],
    },
    async (request, reply) => {
      await modelService.softDelete(request.params.id, request.user!.id);
      return reply.code(204).send();
    },
  );

  fastify.get<{ Params: ModelIdParams }>(
    '/v1/models/:id',
    {
      schema: {
        params: modelIdParamsSchema,
        response: { 200: modelResponseDtoSchema },
        tags: ['Model'],
      },
      preHandler: [resolveModel('read')],
    },
    async (request) => {
      const entity = await modelService.findById(request.params.id);
      return modelMapper.toResponse(entity);
    },
  );

  fastify.withTypeProvider<TypeBoxTypeProvider>().route({
    method: 'GET',
    url: '/v1/models',
    schema: {
      querystring: modelSearchQuerySchema,
      response: { 200: modelPaginatedResponseSchema },
      tags: ['Model', 'Search'],
    },
    handler: async (req, res) => {
      const { limit, page, ...filters } = req.query;
      const result = await searchModelsQuery.execute(
        filters,
        { limit, page },
        req.user?.id ?? null,
      );
      return res.status(200).send({
        ...result,
        data: result.data.map((e) => modelMapper.toResponse(e)),
      });
    },
  });

  fastify.get<{ Params: ModelIdParams; Querystring: ModelSearchQuery }>(
    '/v1/models/:id/children',
    {
      schema: {
        params: modelIdParamsSchema,
        querystring: modelSearchQuerySchema,
        response: { 200: modelPaginatedResponseSchema },
        tags: ['Model'],
      },
      preHandler: [resolveModel('read')],
    },
    async (request) => {
      const { limit, page } = request.query;
      const result = await getModelChildrenQuery.execute(request.params.id, { limit, page });
      return {
        ...result,
        data: result.data.map((e) => modelMapper.toResponse(e)),
      };
    },
  );
}
