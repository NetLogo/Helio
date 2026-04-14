import type { PermissionLevel } from '#src/modules/model-permission/domain/permission.types.ts';
import { ForbiddenException } from '#src/shared/exceptions/index.ts';
import { verifyDownloadToken } from '#src/shared/services/signed-url.service.ts';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';

export const verifySignedDownload: preHandlerHookHandler = async (
  request: FastifyRequest,
  _reply: FastifyReply,
) => {
  const { token } = request.query as { token?: string };
  const { id: fileId } = request.params as { id: string };

  if (token) {
    const result = verifyDownloadToken(token);
    if (!result.valid) {
      throw new ForbiddenException('Invalid or expired download token');
    }
    if (result.fileId !== fileId) {
      throw new ForbiddenException('Token does not match requested file');
    }
    return;
  }

  const { fileRepository } = request.server.diContainer.cradle;
  const { permissionService } = request.server.diContainer.cradle as {
    permissionService: {
      check(
        userId: string | null,
        model: { id: string; visibility: string; deletedAt: Date | null },
        level: PermissionLevel,
      ): Promise<boolean>;
    };
  };

  const model = await (
    fileRepository as {
      findModelByFileId(
        id: string,
      ): Promise<{ id: string; visibility: string; deletedAt: Date | null } | null>;
    }
  ).findModelByFileId(fileId);
  if (!model) {
    throw new ForbiddenException('Access denied');
  }

  const allowed = await permissionService.check(request.user?.id ?? null, model, 'read');
  if (!allowed) {
    throw new ForbiddenException('Access denied');
  }
};
