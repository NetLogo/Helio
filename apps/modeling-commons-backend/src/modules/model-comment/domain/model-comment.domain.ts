import { randomUUID } from 'node:crypto';
import rules from '#src/config/rules.ts';
import { ForbiddenException } from '#src/shared/exceptions/index.ts';
import {
  CommentBodyInvalidError,
  CommentDeletedError,
  ParentCommentMismatchError,
} from '#src/modules/model-comment/domain/model-comment.errors.ts';
import type {
  CommentAuthCaller,
  CreateCommentProps,
  ModelCommentEntity,
} from '#src/modules/model-comment/domain/model-comment.types.ts';

const CONTENT_LENGTH = rules.limits.comment.content;

export default function modelCommentDomain() {
  return {
    createComment(props: CreateCommentProps): ModelCommentEntity {
      const content = props.content.trim();
      const min = CONTENT_LENGTH.min ?? 0;
      const max = CONTENT_LENGTH.max ?? Infinity;

      if (content.length < min) {
        throw new CommentBodyInvalidError('content is empty');
      }
      if (content.length > max) {
        throw new CommentBodyInvalidError(`content exceeds ${max} characters`);
      }

      const now = new Date();
      return {
        id: randomUUID(),
        legacyId: null,
        parentId: props.parentId ?? null,
        userId: props.userId,
        modelId: props.modelId,
        versionNumber: props.versionNumber ?? null,
        content,
        likesCount: 0,
        createdAt: now,
        updatedAt: now,
        editedAt: null,
        deletedAt: null,
      };
    },

    assertNotDeleted(comment: ModelCommentEntity): void {
      if (comment.deletedAt !== null) {
        throw new CommentDeletedError(comment.id);
      }
    },

    assertParentMatchesModel(parent: ModelCommentEntity, modelId: string): void {
      if (parent.modelId !== modelId) {
        throw new ParentCommentMismatchError();
      }
    },

    assertCanEdit(comment: ModelCommentEntity, callerId: string): void {
      if (comment.userId !== callerId) {
        throw new ForbiddenException('Only the comment author can edit this comment');
      }
    },

    assertCanDelete(comment: ModelCommentEntity, caller: CommentAuthCaller): void {
      const isAuthor = comment.userId === caller.id;
      const isAdmin = caller.systemRole === 'admin';
      if (!isAuthor && !isAdmin) {
        throw new ForbiddenException('Only the comment author or an admin can delete this comment');
      }
    },
  };
}
