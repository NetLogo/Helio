import type { FastifyInstance } from 'fastify';
import {
  tagSearchQuerySchema,
  tagIdOrNameParamsSchema,
  type TagSearchQuery,
  type TagIdOrNameParams,
} from '#src/modules/tag/tag.schemas.ts';
import { tagResponseDtoSchema } from '#src/modules/tag/dtos/tag.response.dto.ts';
import { tagPaginatedResponseSchema } from '#src/modules/tag/dtos/tag.paginated.response.dto.ts';

export default async function tagRoutes(fastify: FastifyInstance) {
  const { tagMapper, findTagsByPrefixQuery, findTagQuery } = fastify.diContainer.cradle;

  fastify.get<{ Querystring: TagSearchQuery }>(
    '/v1/tags',
    {
      schema: {
        querystring: tagSearchQuerySchema,
        response: { 200: tagPaginatedResponseSchema },
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

  fastify.get<{ Params: TagIdOrNameParams }>(
    '/v1/tags/:idOrName',
    {
      schema: {
        params: tagIdOrNameParamsSchema,
        response: { 200: tagResponseDtoSchema },
      },
    },
    async (request) => {
      const entity = await findTagQuery.execute(request.params.idOrName);
      return tagMapper.toResponse(entity);
    },
  );
}
