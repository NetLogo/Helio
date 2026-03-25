import { ForbiddenException, NotFoundException } from '#src/shared/exceptions/index.ts';
import type { PermissionLevel } from '#src/modules/model-permission/domain/permission.types.ts';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';

export function resolveModel(level: PermissionLevel): preHandlerHookHandler {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { prisma } = request.server.diContainer.cradle;
    const { permissionService } = request.server.diContainer.cradle as {
      permissionService: {
        check(
          userId: string | null,
          model: { id: string; visibility: string; deletedAt: Date | null },
          level: PermissionLevel,
        ): Promise<boolean>;
      };
    };

    // Use findUnique to bypass soft-delete middleware
    const model = await prisma.model.findUnique({ where: { id } });
    if (!model) {
      throw new NotFoundException('Model not found');
    }

    const allowed = await permissionService.check(
      request.user?.id ?? null,
      {
        id: model.id,
        visibility: model.visibility,
        deletedAt: model.deletedAt,
      },
      level,
    );

    if (!allowed) {
      throw new ForbiddenException('Access denied');
    }

    request.model = model;
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    model: unknown;
  }
}
