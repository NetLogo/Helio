import type { FastifyInstance } from 'fastify';
import {
  tagSearchQuerySchema,
  tagIdOrNameParamsSchema,
  popularTagsQuerySchema,
  type TagSearchQuery,
  type TagIdOrNameParams,
  type PopularTagsQuery,
} from '#src/modules/tag/tag.schemas.ts';
import { tagResponseDtoSchema } from '#src/modules/tag/dtos/tag.response.dto.ts';
import { tagPaginatedResponseSchema } from '#src/modules/tag/dtos/tag.paginated.response.dto.ts';
import { popularTagPaginatedResponseSchema } from '#src/modules/tag/dtos/popular-tag.paginated.response.dto.ts';

export default async function tagRoutes(fastify: FastifyInstance) {
  const { tagMapper, tagService, findTagsByPrefixQuery, findTagQuery } =
    fastify.diContainer.cradle;

  fastify.get<{ Querystring: TagSearchQuery }>(
    '/v1/tags',
    {
      schema: {
        querystring: tagSearchQuerySchema,
        response: { 200: tagPaginatedResponseSchema },
        tags: ['Tag', 'Search'],
      },
    },
    async (request) => {
      const { q = '', limit, page } = request.query;
      const result = await findTagsByPrefixQuery.execute(q, { limit, page });
      return {
        ...result,
        data: result.data.map((e) => tagMapper.toResponse(e)),
      };
    },
  );

  fastify.get<{ Querystring: PopularTagsQuery }>(
    '/v1/tags/popular',
    {
      schema: {
        querystring: popularTagsQuerySchema,
        response: { 200: popularTagPaginatedResponseSchema },
        tags: ['Tag'],
      },
    },
    async (request) => {
      const result = await tagService.listPopular(request.query);
      return {
        count: result.count,
        limit: result.limit,
        page: result.page,
        data: result.data.map((entry) => ({
          tag: tagMapper.toResponse(entry.tag),
          modelCount: entry.modelCount,
        })),
      };
    },
  );

  fastify.get<{ Params: TagIdOrNameParams }>(
    '/v1/tags/:idOrName',
    {
      schema: {
        params: tagIdOrNameParamsSchema,
        response: { 200: tagResponseDtoSchema },
        tags: ['Tag'],
      },
    },
    async (request) => {
      const entity = await findTagQuery.execute(request.params.idOrName);
      return tagMapper.toResponse(entity);
    },
  );
}
