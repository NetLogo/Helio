import { CommentNotFoundError } from '#src/modules/model-comment/domain/model-comment.errors.ts';
import type { ModelCommentEntity } from '#src/modules/model-comment/domain/model-comment.types.ts';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';

// `resolveModel` only authorizes the path model (`:id`); it never checks that
// `:commentId` actually belongs to it. Without this hook, a caller with read
// access to model P could fetch/mutate a comment that belongs to a different
// model M by pointing `:id` at P and `:commentId` at M's comment (IDOR).
export function resolveComment(): preHandlerHookHandler {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const { id, commentId } = request.params as { id: string; commentId: string };
    const { modelCommentRepository } = request.server.diContainer.cradle;

    const comment = await modelCommentRepository.findById(commentId);
    if (!comment || comment.modelId !== id) {
      throw new CommentNotFoundError(commentId);
    }

    request.comment = comment;
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    comment: ModelCommentEntity;
  }
}
