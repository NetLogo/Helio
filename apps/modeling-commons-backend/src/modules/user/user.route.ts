import type { UserSearchFilters } from '#src/modules/user/domain/user.types.ts';
import { userPaginatedResponseSchema } from '#src/modules/user/dtos/user.paginated.response.dto.ts';
import { userResponseDtoSchema } from '#src/modules/user/dtos/user.response.dto.ts';
import {
  updateUserRequestDtoSchema,
  userIdParamsSchema,
  userSearchQuerySchema,
  type UpdateUserRequestDto,
  type UserIdParams,
  type UserSearchQuery,
} from '#src/modules/user/user.schemas.ts';
import { UnexpectedBehaviorException } from '#src/shared/exceptions/exceptions.ts';
import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import type { FastifyInstance } from 'fastify';

export default async function userRoutes(fastify: FastifyInstance) {
  const { userService, userMapper } = fastify.diContainer.cradle;

  fastify.patch<{ Params: UserIdParams; Body: UpdateUserRequestDto }>(
    '/v1/users/:id',
    {
      schema: {
        params: userIdParamsSchema,
        body: updateUserRequestDtoSchema,
        tags: ['User'],
        description:
          'Update user profile. Users can only update their own profile, except admins who can update any profile.',
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { onboardedAt, ...rest } = request.body;
      await userService.updateProfile(
        request.params.id,
        request.user!.id,
        request.user!.systemRole,
        {
          ...rest,
          ...(onboardedAt !== undefined
            ? { onboardedAt: onboardedAt === null ? null : new Date(onboardedAt) }
            : {}),
        },
      );
      return reply.code(204).send();
    },
  );

  fastify.delete<{ Params: UserIdParams }>(
    '/v1/users/:id',
    {
      schema: {
        params: userIdParamsSchema,
        tags: ['User'],
        description:
          'Soft delete a user. Users can only delete their own account, except admins who can delete any account.',
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      // TODO: Integrate with BetterAuth. This wouldn't work on its own.
      await userService.softDelete(request.params.id, request.user!.id, request.user!.systemRole);
      return reply.code(204).send();
    },
  );

  fastify.get<{ Params: UserIdParams }>(
    '/v1/users/:id',
    {
      schema: {
        params: userIdParamsSchema,
        response: { 200: userResponseDtoSchema },
        tags: ['User'],
      },
    },
    async (request) => {
      const result = await userService.findById(
        request.params.id,
        request.user?.id ?? null,
        request.user?.systemRole ?? null,
      );
      console.log(result);
      if (result.canViewFullProfile) {
        return userMapper.toResponse(result.user);
      }
      return userMapper.toPublicResponse(result.user);
    },
  );

  fastify.get(
    '/v1/users/whoami',
    {
      schema: {
        response: { 200: userResponseDtoSchema },
        tags: ['User'],
        description: 'Get the currently authenticated user.',
      },
      preHandler: [requireAuth],
    },
    async (request) => {
      const user = request.user!;
      const result = await userService.findById(user.id, user.id, user.systemRole);
      if (result.canViewFullProfile) {
        return userMapper.toResponse(result.user);
      } else {
        throw new UnexpectedBehaviorException(
          'Authenticated user should always be able to view their full profile',
        );
      }
    },
  );

  fastify.get<{ Querystring: UserSearchQuery }>(
    '/v1/users',
    {
      schema: {
        querystring: userSearchQuerySchema,
        response: { 200: userPaginatedResponseSchema },
        tags: ['User', 'Search'],
      },
    },
    async (request) => {
      const { limit, page, ...filters } = request.query;
      const result = await userService.findAll(
        filters as UserSearchFilters,
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
