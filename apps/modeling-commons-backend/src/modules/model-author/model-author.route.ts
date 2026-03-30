import { Type } from 'typebox';
import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import { resolveModel } from '#src/shared/hooks/resolve-model.ts';
import type { FastifyInstance } from 'fastify';
import {
  modelAuthorParamsSchema,
  modelAuthorUserParamsSchema,
  addContributorRequestDtoSchema,
  transferOwnershipRequestDtoSchema,
  userIdParamsSchema,
  userModelsQuerySchema,
  type ModelAuthorParams,
  type ModelAuthorUserParams,
  type AddContributorRequestDto,
  type TransferOwnershipRequestDto,
  type UserIdParams,
  type UserModelsQuery,
} from '#src/modules/model-author/model-author.schemas.ts';
import { modelAuthorResponseDtoSchema } from '#src/modules/model-author/dtos/model-author.response.dto.ts';
import { modelAuthorPaginatedResponseSchema } from '#src/modules/model-author/dtos/model-author.paginated.response.dto.ts';

export default async function modelAuthorRoutes(fastify: FastifyInstance) {
  const { modelAuthorService, modelAuthorMapper, listAuthorsQuery, listUserModelsQuery } =
    fastify.diContainer.cradle;

  fastify.post<{ Params: ModelAuthorParams; Body: AddContributorRequestDto }>(
    '/v1/models/:id/authors',
    {
      schema: {
        params: modelAuthorParamsSchema,
        body: addContributorRequestDtoSchema,
        response: { 201: modelAuthorResponseDtoSchema },
        tags: ['Model'],
      },
      preHandler: [requireAuth, resolveModel('admin')],
    },
    async (request, reply) => {
      await modelAuthorService.addContributor(
        request.params.id,
        request.body.userId,
        request.user!.id,
      );
      return reply.code(201).send();
    },
  );

  fastify.delete<{ Params: ModelAuthorUserParams }>(
    '/v1/models/:id/authors/:userId',
    {
      schema: {
        params: modelAuthorUserParamsSchema,
        tags: ['Model'],
      },
      preHandler: [requireAuth, resolveModel('admin')],
    },
    async (request, reply) => {
      await modelAuthorService.remove(request.params.id, request.params.userId, request.user!.id);
      return reply.code(204).send();
    },
  );

  fastify.post<{ Params: ModelAuthorParams; Body: TransferOwnershipRequestDto }>(
    '/v1/models/:id/authors/transfer',
    {
      schema: {
        params: modelAuthorParamsSchema,
        body: transferOwnershipRequestDtoSchema,
        tags: ['Model'],
      },
      preHandler: [requireAuth, resolveModel('admin')],
    },
    async (request, reply) => {
      await modelAuthorService.transferOwnership(
        request.params.id,
        request.body.newOwnerId,
        request.user!.id,
      );
      return reply.code(204).send();
    },
  );

  fastify.get<{ Params: ModelAuthorParams }>(
    '/v1/models/:id/authors',
    {
      schema: {
        params: modelAuthorParamsSchema,
        response: { 200: Type.Array(modelAuthorResponseDtoSchema) },
        tags: ['Model'],
      },
      preHandler: [resolveModel('read')],
    },
    async (request) => {
      const authors = await listAuthorsQuery.execute(request.params.id);
      return authors.map((a) => modelAuthorMapper.toResponse(a));
    },
  );

  fastify.get<{ Params: UserIdParams; Querystring: UserModelsQuery }>(
    '/v1/users/:id/models',
    {
      schema: {
        params: userIdParamsSchema,
        querystring: userModelsQuerySchema,
        response: { 200: modelAuthorPaginatedResponseSchema },
        tags: ['User'],
      },
    },
    async (request) => {
      const { limit, page } = request.query;
      const result = await listUserModelsQuery.execute(request.params.id, { limit, page });
      return {
        ...result,
        data: result.data.map((a) => modelAuthorMapper.toResponse(a)),
      };
    },
  );
}
