import { ForbiddenException, NotFoundException } from '#src/shared/exceptions/index.ts';
import type { AccessLevel, PolicyContext } from '#src/shared/permissions/model-access.types.ts';
import { policy } from '#src/shared/permissions/model-access.policy.ts';
import { loadViewer } from '#src/shared/permissions/model-access.viewer.ts';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';

export function resolveModel(level: AccessLevel): preHandlerHookHandler {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { db, permissionRepository } = request.server.diContainer.cradle;

    const model = await db.model.findUnique({ where: { id } });
    if (!model) {
      throw new NotFoundException('Model not found');
    }

    const viewer = await loadViewer(db, request.user?.id ?? null);

    const [author, grant] = viewer
      ? await Promise.all([
          permissionRepository.findAuthor(model.id, viewer.id),
          permissionRepository.findByModelAndUser(model.id, viewer.id),
        ])
      : [undefined, undefined];

    const ctx: PolicyContext = {
      viewer,
      model: {
        id: model.id,
        visibility: model.visibility,
        deletedAt: model.deletedAt,
      },
      ownerRole: author?.role ?? null,
      grantLevel: grant?.permissionLevel ?? null,
    };

    const allowed = policy[level](ctx);

    if (!allowed) {
      throw new ForbiddenException(`You do not have permission to ${level} this model`);
    }

    request.model = model;
    request.modelAccess = ctx;
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    model: unknown;
    modelAccess: PolicyContext;
  }
}
