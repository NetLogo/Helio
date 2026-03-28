import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import type { FastifyInstance } from 'fastify';
import {
  updateUserRequestDtoSchema,
  userIdParamsSchema,
  userSearchQuerySchema,
  type UpdateUserRequestDto,
  type UserIdParams,
  type UserSearchQuery,
} from '#src/modules/user/user.schemas.ts';
import { userResponseDtoSchema } from '#src/modules/user/dtos/user.response.dto.ts';
import { userPaginatedResponseSchema } from '#src/modules/user/dtos/user.paginated.response.dto.ts';

export default async function userRoutes(fastify: FastifyInstance) {
  const { userService, userMapper } = fastify.diContainer.cradle;

  fastify.patch<{ Params: UserIdParams; Body: UpdateUserRequestDto }>(
    '/v1/users/:id',
    {
      schema: {
        params: userIdParamsSchema,
        body: updateUserRequestDtoSchema,
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      await userService.updateProfile(
        request.params.id,
        request.user!.id,
        request.user!.systemRole,
        request.body,
      );
      return reply.code(204).send();
    },
  );

  fastify.delete<{ Params: UserIdParams }>(
    '/v1/users/:id',
    {
      schema: { params: userIdParamsSchema },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      await userService.softDelete(
        request.params.id,
        request.user!.id,
        request.user!.systemRole,
      );
      return reply.code(204).send();
    },
  );

  fastify.get<{ Params: UserIdParams }>(
    '/v1/users/:id',
    {
      schema: {
        params: userIdParamsSchema,
        response: { 200: userResponseDtoSchema },
      },
    },
    async (request) => {
      const entity = await userService.findById(
        request.params.id,
        request.user?.id ?? null,
        request.user?.systemRole ?? null,
      );
      return userMapper.toResponse(entity);
    },
  );

  fastify.get<{ Querystring: UserSearchQuery }>(
    '/v1/users',
    {
      schema: {
        querystring: userSearchQuerySchema,
        response: { 200: userPaginatedResponseSchema },
      },
    },
    async (request) => {
      const { limit, page, ...filters } = request.query;
      const result = await userService.findAll(
        filters,
        { limit, page },
        request.user?.systemRole ?? null,
      );
      return {
        ...result,
        data: result.data.map((e) => userMapper.toResponse(e)),
      };
    },
  );
}
