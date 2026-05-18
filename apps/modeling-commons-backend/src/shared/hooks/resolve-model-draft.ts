import {
  ModelDraftAccessDeniedError,
  ModelDraftNotFoundError,
} from '#src/modules/model-draft/domain/model-draft.errors.ts';
import type { ModelDraftEntity } from '#src/modules/model-draft/domain/model-draft.types.ts';
import { ModelNotFoundError } from '#src/modules/model/domain/model.errors.ts';
import { ForbiddenException, UnauthorizedException } from '#src/shared/exceptions/index.ts';
import { canWrite } from '#src/shared/permissions/model-access.policy.ts';
import { loadModelAccessContext } from '#src/shared/permissions/model-access.viewer.ts';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';

export function resolveModelDraft(): preHandlerHookHandler {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = request.user?.id;
    if (!userId) throw new UnauthorizedException('Authentication required');

    const { db, modelDraftRepository } = request.server.diContainer.cradle;

    const draft = await modelDraftRepository.findById(id);
    if (!draft) throw new ModelDraftNotFoundError(id);
    if (draft.userId !== userId) throw new ModelDraftAccessDeniedError();

    if (draft.modelId) {
      const ctx = await loadModelAccessContext(db, userId, draft.modelId);
      if (!ctx.model) throw new ModelNotFoundError(draft.modelId);
      if (!canWrite(ctx)) {
        throw new ForbiddenException('No write access to the model linked to this draft');
      }
    }

    request.modelDraft = draft;
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    modelDraft: ModelDraftEntity;
  }
}
