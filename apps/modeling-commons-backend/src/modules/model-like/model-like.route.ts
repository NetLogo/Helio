import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import { resolveModel } from '#src/shared/hooks/resolve-model.ts';
import type { FastifyInstance } from 'fastify';
import { modelIdParamsSchema, type ModelIdParams } from '#src/modules/model/dtos/model.dto.ts';
import { modelLikeSummaryResponseSchema } from '#src/modules/model-like/dtos/model-like.response.dto.ts';

export default async function modelLikeRoutes(fastify: FastifyInstance) {
  const { modelLikeService } = fastify.diContainer.cradle;

  fastify.post<{ Params: ModelIdParams }>(
    '/v1/models/:id/like',
    {
      schema: { params: modelIdParamsSchema, tags: ['Model'] },
      preHandler: [requireAuth, resolveModel('read')],
    },
    async (request, reply) => {
      await modelLikeService.like(request.params.id, request.user!.id);
      return reply.code(204).send();
    },
  );

  fastify.delete<{ Params: ModelIdParams }>(
    '/v1/models/:id/like',
    {
      schema: { params: modelIdParamsSchema, tags: ['Model'] },
      preHandler: [requireAuth, resolveModel('read')],
    },
    async (request, reply) => {
      await modelLikeService.unlike(request.params.id, request.user!.id);
      return reply.code(204).send();
    },
  );

  fastify.get<{ Params: ModelIdParams }>(
    '/v1/models/:id/likes',
    {
      schema: {
        params: modelIdParamsSchema,
        response: { 200: modelLikeSummaryResponseSchema },
        tags: ['Model'],
      },
      preHandler: [resolveModel('read')],
    },
    async (request) => {
      return modelLikeService.summary(request.params.id, request.user?.id ?? null);
    },
  );
}
