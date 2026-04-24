import type { FastifyInstance } from 'fastify';
import { resolveModel } from '#src/shared/hooks/resolve-model.ts';
import { modelIdParamsSchema, type ModelIdParams } from '#src/modules/model/dtos/model.dto.ts';
import {
  interactionSummaryResponseSchema,
  recordInteractionBodySchema,
  type RecordInteractionBody,
} from '#src/modules/model-interaction/dtos/model-interaction.dto.ts';
import { ModelInteractionKind } from '#src/modules/model-interaction/domain/model-interaction.types.ts';
import { getClientContext } from '#src/shared/http/client-context.ts';

export default async function modelInteractionRoutes(fastify: FastifyInstance) {
  const { modelInteractionService } = fastify.diContainer.cradle;

  const register = (path: string, kind: typeof ModelInteractionKind[keyof typeof ModelInteractionKind]) => {
    fastify.post<{ Params: ModelIdParams; Body: RecordInteractionBody }>(
      path,
      {
        schema: {
          params: modelIdParamsSchema,
          body: recordInteractionBodySchema,
          tags: ['Model'],
        },
        preHandler: [resolveModel('read')],
      },
      async (request, reply) => {
        await modelInteractionService.record(
          kind,
          request.params.id,
          getClientContext(request),
          request.body?.versionNumber ?? null,
        );
        return reply.code(204).send();
      },
    );
  };

  register('/v1/models/:id/views', ModelInteractionKind.view);
  register('/v1/models/:id/runs', ModelInteractionKind.run);
  register('/v1/models/:id/downloads', ModelInteractionKind.download);
  register('/v1/models/:id/shares', ModelInteractionKind.share);

  fastify.get<{ Params: ModelIdParams }>(
    '/v1/models/:id/interactions',
    {
      schema: {
        params: modelIdParamsSchema,
        response: { 200: interactionSummaryResponseSchema },
        tags: ['Model'],
      },
      preHandler: [resolveModel('read')],
    },
    async (request) => {
      const s = await modelInteractionService.summary(request.params.id, request.user?.id ?? null);
      return {
        likes: s.likes,
        views: s.view,
        runs: s.run,
        downloads: s.download,
        shares: s.share,
        likedByMe: s.likedByMe,
      };
    },
  );
}
