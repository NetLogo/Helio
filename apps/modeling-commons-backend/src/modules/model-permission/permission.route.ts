import { Type } from 'typebox';
import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import { resolveModel } from '#src/shared/hooks/resolve-model.ts';
import type { FastifyInstance } from 'fastify';
import {
  permissionParamsSchema,
  permissionGranteeParamsSchema,
  grantPermissionRequestDtoSchema,
  type PermissionParams,
  type PermissionGranteeParams,
  type GrantPermissionRequestDto,
} from '#src/modules/model-permission/permission.schemas.ts';
import { permissionResponseDtoSchema } from '#src/modules/model-permission/dtos/permission.response.dto.ts';
import type { PermissionLevel } from '#src/modules/model-permission/domain/permission.types.ts';

export default async function permissionRoutes(fastify: FastifyInstance) {
  const { permissionService, permissionMapper } = fastify.diContainer.cradle;

  fastify.post<{ Params: PermissionParams; Body: GrantPermissionRequestDto }>(
    '/v1/models/:id/permissions',
    {
      schema: {
        params: permissionParamsSchema,
        body: grantPermissionRequestDtoSchema,
        response: { 201: permissionResponseDtoSchema },
        tags: ['Model', 'Permission'],
      },
      preHandler: [requireAuth, resolveModel('admin')],
    },
    async (request, reply) => {
      const entity = await permissionService.grant(
        request.params.id,
        request.body.granteeUserId,
        request.body.permissionLevel as PermissionLevel,
        request.user!.id,
      );
      return reply.code(201).send(permissionMapper.toResponse(entity));
    },
  );

  fastify.delete<{ Params: PermissionGranteeParams }>(
    '/v1/models/:id/permissions/:granteeUserId',
    {
      schema: {
        params: permissionGranteeParamsSchema,
        tags: ['Model', 'Permission'],
      },
      preHandler: [requireAuth, resolveModel('admin')],
    },
    async (request, reply) => {
      await permissionService.revoke(
        request.params.id,
        request.params.granteeUserId,
        request.user!.id,
      );
      return reply.code(204).send();
    },
  );

  fastify.get<{ Params: PermissionParams }>(
    '/v1/models/:id/permissions',
    {
      schema: {
        params: permissionParamsSchema,
        response: { 200: Type.Array(permissionResponseDtoSchema) },
        tags: ['Model', 'Permission'],
      },
      preHandler: [requireAuth, resolveModel('admin')],
    },
    async (request) => {
      const permissions = await permissionService.listByModel(request.params.id);
      return permissions.map((p) => permissionMapper.toResponse(p));
    },
  );
}
