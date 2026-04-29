import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import { resolveModel } from '#src/shared/hooks/resolve-model.ts';
import type { FastifyInstance } from 'fastify';
import {
  modelIdParamsSchema,
  modelLegacyIdParamsSchema,
  modelPaginatedResponseSchema,
  modelResponseDtoSchema,
  modelSearchQuerySchema,
  updateModelRequestDtoSchema,
  type ModelIdParams,
  type ModelLegacyIdParams,
  type ModelSearchQuery,
  type UpdateModelRequestDto,
} from '#src/modules/model/dtos/model.dto.ts';
import { modelCardResponseDtoSchema } from '#src/modules/model/dtos/model.card.dto.ts';
import { modelFamilyCardResponseDtoSchema } from '#src/modules/model/dtos/model.family-card.dto.ts';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

export default async function modelRoutes(fastify: FastifyInstance) {
  const {
    modelService,
    modelMapper,
    searchModelsQuery,
    getModelChildrenQuery,
    getModelCardQuery,
    getModelFamilyCardQuery,
  } = fastify.diContainer.cradle;

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

  fastify.get<{ Params: ModelIdParams }>(
    '/v1/models/:id/card',
    {
      schema: {
        params: modelIdParamsSchema,
        response: { 200: modelCardResponseDtoSchema },
        tags: ['Model'],
      },
      preHandler: [resolveModel('read')],
    },
    async (request) => {
      return getModelCardQuery.execute(request.params.id, request.user?.id ?? null);
    },
  );

  fastify.get<{ Params: ModelIdParams }>(
    '/v1/models/:id/family/card',
    {
      schema: {
        params: modelIdParamsSchema,
        response: { 200: modelFamilyCardResponseDtoSchema },
        tags: ['Model'],
      },
      preHandler: [resolveModel('read')],
    },
    async (request) => {
      return getModelFamilyCardQuery.execute(request.params.id);
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

  fastify.get<{ Params: ModelLegacyIdParams }>(
    '/v1/legacy/models/:legacyId/resolve',
    {
      schema: {
        params: modelLegacyIdParamsSchema,
        tags: ['Model', 'Legacy'],
      },
    },
    async (request, reply) => {
      const id = await modelService.resolveLegacyId(request.params.legacyId);
      return reply.status(200).send({ id });
    },
  );
}
