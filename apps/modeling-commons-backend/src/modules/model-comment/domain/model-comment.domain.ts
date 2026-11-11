import {
  commentContentRules,
  getCommentContentIssue,
  normalizeCommentContent,
  type CommentContentIssue,
} from '@repo/modeling-commons-shared';
import { newId } from '#src/shared/utils/id.ts';
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

const contentIssueReasons: Record<CommentContentIssue, string> = {
  tooShort: 'content is empty',
  tooLong: `content exceeds ${commentContentRules.length.max} characters`,
};

function parseContent(content: string): string {
  const issue = getCommentContentIssue(content);
  if (issue) {
    throw new CommentBodyInvalidError(contentIssueReasons[issue]);
  }
  return normalizeCommentContent(content);
}

export default function modelCommentDomain() {
  return {
    parseContent,

    createComment(props: CreateCommentProps): ModelCommentEntity {
      const content = parseContent(props.content);
      const now = new Date();
      return {
        id: newId(),
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
