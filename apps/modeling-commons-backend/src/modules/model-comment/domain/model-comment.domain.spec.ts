import { describe, it, expect } from 'vitest';
import modelCommentDomain from '#src/modules/model-comment/domain/model-comment.domain.ts';
import {
  CommentBodyInvalidError,
  CommentDeletedError,
  ParentCommentMismatchError,
} from '#src/modules/model-comment/domain/model-comment.errors.ts';
import { ForbiddenException } from '#src/shared/exceptions/index.ts';
import type { ModelCommentEntity } from '#src/modules/model-comment/domain/model-comment.types.ts';

const domain = modelCommentDomain();

function makeComment(overrides: Partial<ModelCommentEntity> = {}): ModelCommentEntity {
  const now = new Date();
  return {
    id: 'comment-1',
    legacyId: null,
    parentId: null,
    userId: 'user-1',
    modelId: 'model-1',
    versionNumber: null,
    content: 'hello world',
    likesCount: 0,
    createdAt: now,
    updatedAt: now,
    editedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

describe('modelCommentDomain', () => {
  describe('createComment', () => {
    it('builds a well-formed entity', () => {
      const comment = domain.createComment({
        modelId: 'model-1',
        userId: 'user-1',
        content: 'hello world',
      });

      expect(comment.modelId).toBe('model-1');
      expect(comment.userId).toBe('user-1');
      expect(comment.content).toBe('hello world');
      expect(comment.parentId).toBeNull();
      expect(comment.versionNumber).toBeNull();
      expect(comment.editedAt).toBeNull();
      expect(comment.deletedAt).toBeNull();
      expect(comment.likesCount).toBe(0);
      expect(comment.createdAt).toEqual(comment.updatedAt);
      expect(typeof comment.id).toBe('string');
      expect(comment.id.length).toBeGreaterThan(0);
    });

    it('carries parentId and versionNumber when provided', () => {
      const comment = domain.createComment({
        modelId: 'model-1',
        userId: 'user-1',
        parentId: 'parent-1',
        versionNumber: 2,
        content: 'a reply',
      });

      expect(comment.parentId).toBe('parent-1');
      expect(comment.versionNumber).toBe(2);
    });

    it('trims whitespace before storing content', () => {
      const comment = domain.createComment({
        modelId: 'model-1',
        userId: 'user-1',
        content: '  hello  ',
      });

      expect(comment.content).toBe('hello');
    });

    it('throws CommentBodyInvalidError for empty content', () => {
      expect(() =>
        domain.createComment({ modelId: 'model-1', userId: 'user-1', content: '' }),
      ).toThrow(CommentBodyInvalidError);
    });

    it('throws CommentBodyInvalidError for whitespace-only content', () => {
      expect(() =>
        domain.createComment({ modelId: 'model-1', userId: 'user-1', content: '   \n\t  ' }),
      ).toThrow(CommentBodyInvalidError);
    });

    it('throws CommentBodyInvalidError for content over 10,000 characters', () => {
      const tooLong = 'a'.repeat(10_001);
      expect(() =>
        domain.createComment({ modelId: 'model-1', userId: 'user-1', content: tooLong }),
      ).toThrow(CommentBodyInvalidError);
    });

    it('accepts content at exactly the 10,000 character bound', () => {
      const atBound = 'a'.repeat(10_000);
      const comment = domain.createComment({
        modelId: 'model-1',
        userId: 'user-1',
        content: atBound,
      });
      expect(comment.content).toHaveLength(10_000);
    });
  });

  describe('assertNotDeleted', () => {
    it('passes when not deleted', () => {
      expect(() => domain.assertNotDeleted(makeComment())).not.toThrow();
    });

    it('throws CommentDeletedError when deletedAt is set', () => {
      expect(() =>
        domain.assertNotDeleted(makeComment({ deletedAt: new Date() })),
      ).toThrow(CommentDeletedError);
    });
  });

  describe('assertParentMatchesModel', () => {
    it('passes when the parent belongs to the model', () => {
      const parent = makeComment({ modelId: 'model-1' });
      expect(() => domain.assertParentMatchesModel(parent, 'model-1')).not.toThrow();
    });

    it('throws ParentCommentMismatchError when the parent belongs to a different model', () => {
      const parent = makeComment({ modelId: 'model-2' });
      expect(() => domain.assertParentMatchesModel(parent, 'model-1')).toThrow(
        ParentCommentMismatchError,
      );
    });
  });

  describe('assertCanEdit', () => {
    it('passes for the author', () => {
      const comment = makeComment({ userId: 'user-1' });
      expect(() => domain.assertCanEdit(comment, 'user-1')).not.toThrow();
    });

    it('throws ForbiddenException for a non-author', () => {
      const comment = makeComment({ userId: 'user-1' });
      expect(() => domain.assertCanEdit(comment, 'user-2')).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for an admin who is not the author', () => {
      const comment = makeComment({ userId: 'user-1' });
      expect(() => domain.assertCanEdit(comment, 'admin-1')).toThrow(ForbiddenException);
    });
  });

  describe('assertCanDelete', () => {
    it('passes for the author', () => {
      const comment = makeComment({ userId: 'user-1' });
      expect(() =>
        domain.assertCanDelete(comment, { id: 'user-1', systemRole: 'user' }),
      ).not.toThrow();
    });

    it('passes for an admin who is not the author', () => {
      const comment = makeComment({ userId: 'user-1' });
      expect(() =>
        domain.assertCanDelete(comment, { id: 'admin-1', systemRole: 'admin' }),
      ).not.toThrow();
    });

    it('throws ForbiddenException for a random user', () => {
      const comment = makeComment({ userId: 'user-1' });
      expect(() =>
        domain.assertCanDelete(comment, { id: 'user-2', systemRole: 'user' }),
      ).toThrow(ForbiddenException);
    });
  });
});
