import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import { resolveModel } from '#src/shared/hooks/resolve-model.ts';
import type { FastifyInstance } from 'fastify';
import {
  addTagRequestDtoSchema,
  removeTagParamsSchema,
  versionTagsParamsSchema,
  type AddTagRequestDto,
  type RemoveTagParams,
  type VersionTagsParams,
} from '#src/modules/model-version-tag/model-version-tag.schemas.ts';
import { modelVersionTagResponseDtoSchema } from '#src/modules/model-version-tag/dtos/model-version-tag.response.dto.ts';
import { modelIdParamsSchema, type ModelIdParams } from '#src/modules/model/model.schemas.ts';
import { tagResponseDtoSchema } from '#src/modules/tag/dtos/tag.response.dto.ts';
import { Type } from 'typebox';

export default async function modelVersionTagRoutes(fastify: FastifyInstance) {
  const { modelVersionTagService, tagService, listTagsByVersionQuery } =
    fastify.diContainer.cradle;

  fastify.post<{ Params: ModelIdParams; Body: AddTagRequestDto }>(
    '/v1/models/:id/tags',
    {
      schema: {
        params: modelIdParamsSchema,
        body: addTagRequestDtoSchema,
        response: { 201: modelVersionTagResponseDtoSchema },
      },
      preHandler: [requireAuth, resolveModel('write')],
    },
    async (request, reply) => {
      const entity = await modelVersionTagService.add(
        request.params.id,
        request.user!.id,
        request.body.name,
      );
      const tag = await tagService.findByIdOrName(entity.tagId);
      return reply.code(201).send({
        modelVersionId: entity.modelVersionId,
        tagId: entity.tagId,
        tagName: tag.name,
        createdAt: entity.createdAt.toISOString(),
      });
    },
  );

  fastify.delete<{ Params: RemoveTagParams }>(
    '/v1/models/:id/tags/:tagId',
    {
      schema: {
        params: removeTagParamsSchema,
      },
      preHandler: [requireAuth, resolveModel('write')],
    },
    async (request, reply) => {
      await modelVersionTagService.remove(
        request.params.id,
        request.user!.id,
        request.params.tagId,
      );
      return reply.code(204).send();
    },
  );

  fastify.get<{ Params: VersionTagsParams }>(
    '/v1/models/:id/versions/:version/tags',
    {
      schema: {
        params: versionTagsParamsSchema,
        response: { 200: Type.Array(tagResponseDtoSchema) },
      },
      preHandler: [resolveModel('read')],
    },
    async (request) => {
      const entities = await listTagsByVersionQuery.execute(
        request.params.id,
        request.params.version,
      );
      const tags = await Promise.all(
        entities.map((e) => tagService.findByIdOrName(e.tagId)),
      );
      return tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        createdAt: tag.createdAt.toISOString(),
      }));
    },
  );
}
