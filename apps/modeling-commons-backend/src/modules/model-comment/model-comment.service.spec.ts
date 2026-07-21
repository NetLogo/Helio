import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeModelCommentService from '#src/modules/model-comment/model-comment.service.ts';
import modelCommentDomain from '#src/modules/model-comment/domain/model-comment.domain.ts';
import {
  CommentDeletedError,
  CommentNotFoundError,
  ParentCommentMismatchError,
} from '#src/modules/model-comment/domain/model-comment.errors.ts';
import { ForbiddenException } from '#src/shared/exceptions/index.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import { mockModelCommentRepository } from '#src/modules/model-comment/database/model-comment.repository.mock.ts';
import { mockEventRepository } from '#src/modules/event/database/event.repository.mock.ts';
import { mockModelAuthorRepository } from '#src/modules/model-author/database/model-author.repository.mock.ts';
import { mockUserRepository } from '#src/modules/user/database/user.repository.mock.ts';
import type { ModelCommentEntity } from '#src/modules/model-comment/domain/model-comment.types.ts';

function makeComment(overrides: Partial<ModelCommentEntity> = {}): ModelCommentEntity {
  return {
    id: 'comment-1',
    legacyId: null,
    parentId: null,
    userId: 'author-1',
    modelId: 'model-1',
    versionNumber: null,
    content: 'hello',
    likesCount: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    editedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

// Flushes the fire-and-forget notification promise chain started inside `create`.
async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

describe('modelCommentService', () => {
  const modelCommentRepository = mockModelCommentRepository();
  const eventRepository = mockEventRepository();
  const modelAuthorRepository = mockModelAuthorRepository();
  const userRepository = mockUserRepository();
  const mailService = { sendMail: vi.fn() };
  const mailDomain = {
    createCommentedOnModelEmail: vi.fn(),
    createRepliedToCommentEmail: vi.fn(),
  };
  const getModelCardQuery = { execute: vi.fn() };
  const transactionManager = mockTransactionManager();
  const domain = modelCommentDomain();
  const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn() };

  const service = makeModelCommentService({
    transactionManager,
    modelCommentRepository,
    modelCommentDomain: domain,
    eventRepository,
    modelAuthorRepository,
    userRepository,
    getModelCardQuery,
    mailService,
    mailDomain,
    logger,
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
    const rendered = { from: 'a@b.com', to: 'x@y.com', subject: 'subj', html: '<p/>', text: 'p' };
    mailDomain.createCommentedOnModelEmail.mockResolvedValue(rendered);
    mailDomain.createRepliedToCommentEmail.mockResolvedValue(rendered);
    getModelCardQuery.execute.mockResolvedValue({
      latestVersion: { title: 'My Model' },
      previewImageUrl: null,
      authors: [],
    });
    mailService.sendMail.mockResolvedValue(undefined);
  });

  describe('create', () => {
    it('writes a comment row and event, and notifies authors except the commenter', async () => {
      modelAuthorRepository.findAllByModel.mockResolvedValue([
        { modelId: 'model-1', userId: 'author-1', role: 'owner' },
        { modelId: 'model-1', userId: 'commenter-1', role: 'contributor' },
      ]);
      userRepository.findOneById.mockResolvedValue({ id: 'author-1', email: 'author@x.com', name: 'Author' });

      const result = await service.create({
        modelId: 'model-1',
        userId: 'commenter-1',
        content: 'hello world',
      });

      expect(result.id).toBeTypeOf('string');
      expect(modelCommentRepository.insertTx).toHaveBeenCalledOnce();
      expect(eventRepository.insert).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'model_comment.created',
          actorId: 'commenter-1',
          resourceType: 'model',
          resourceId: 'model-1',
          payload: expect.objectContaining({ parentId: null }),
        }),
      );

      await flushMicrotasks();

      expect(userRepository.findOneById).toHaveBeenCalledWith('author-1');
      expect(mailDomain.createCommentedOnModelEmail).toHaveBeenCalledOnce();
      expect(mailDomain.createRepliedToCommentEmail).not.toHaveBeenCalled();
      expect(mailService.sendMail).toHaveBeenCalledOnce();
    });

    it('drops versionNumber on a reply', async () => {
      const parent = makeComment({ id: 'parent-1', modelId: 'model-1' });
      modelCommentRepository.findById.mockResolvedValue(parent);
      modelAuthorRepository.findAllByModel.mockResolvedValue([]);

      await service.create({
        modelId: 'model-1',
        userId: 'commenter-1',
        parentId: 'parent-1',
        versionNumber: 3,
        content: 'a reply',
      });

      const insertedEntity = modelCommentRepository.insertTx.mock.calls[0]![1];
      expect(insertedEntity.versionNumber).toBeNull();
      expect(insertedEntity.parentId).toBe('parent-1');
    });

    it('throws ParentCommentMismatchError when the parent belongs to a different model', async () => {
      const parent = makeComment({ id: 'parent-1', modelId: 'other-model' });
      modelCommentRepository.findById.mockResolvedValue(parent);

      await expect(
        service.create({ modelId: 'model-1', userId: 'commenter-1', parentId: 'parent-1', content: 'x' }),
      ).rejects.toThrow(ParentCommentMismatchError);
    });

    it('throws CommentDeletedError when the parent is soft-deleted', async () => {
      const parent = makeComment({ id: 'parent-1', modelId: 'model-1', deletedAt: new Date() });
      modelCommentRepository.findById.mockResolvedValue(parent);

      await expect(
        service.create({ modelId: 'model-1', userId: 'commenter-1', parentId: 'parent-1', content: 'x' }),
      ).rejects.toThrow(CommentDeletedError);
    });

    it('throws CommentNotFoundError when the parent does not exist', async () => {
      modelCommentRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.create({ modelId: 'model-1', userId: 'commenter-1', parentId: 'missing', content: 'x' }),
      ).rejects.toThrow(CommentNotFoundError);
    });

    it('does not throw out of create when notifying recipients rejects', async () => {
      modelAuthorRepository.findAllByModel.mockResolvedValue([
        { modelId: 'model-1', userId: 'author-1', role: 'owner' },
      ]);
      userRepository.findOneById.mockResolvedValue({ id: 'author-1', email: 'author@x.com', name: 'Author' });
      mailService.sendMail.mockRejectedValue(new Error('smtp down'));

      await expect(
        service.create({ modelId: 'model-1', userId: 'commenter-1', content: 'hello' }),
      ).resolves.toEqual(expect.objectContaining({ id: expect.any(String) }));

      await flushMicrotasks();

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('updateContent', () => {
    it('throws ForbiddenException when the caller is not the author', async () => {
      modelCommentRepository.findById.mockResolvedValue(makeComment({ userId: 'author-1' }));

      await expect(
        service.updateContent({
          modelId: 'model-1',
          commentId: 'comment-1',
          callerId: 'someone-else',
          content: 'new content',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('sets editedAt and emits model_comment.updated when the author edits', async () => {
      modelCommentRepository.findById.mockResolvedValue(makeComment({ userId: 'author-1' }));

      await service.updateContent({
        modelId: 'model-1',
        commentId: 'comment-1',
        callerId: 'author-1',
        content: 'new content',
      });

      expect(modelCommentRepository.updateContentTx).toHaveBeenCalledWith(
        expect.anything(),
        'comment-1',
        'new content',
        expect.any(Date),
      );
      expect(eventRepository.insert).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'model_comment.updated', actorId: 'author-1' }),
      );
    });

    it('throws CommentNotFoundError when the comment belongs to a different model', async () => {
      modelCommentRepository.findById.mockResolvedValue(makeComment({ modelId: 'other-model' }));

      await expect(
        service.updateContent({
          modelId: 'model-1',
          commentId: 'comment-1',
          callerId: 'author-1',
          content: 'x',
        }),
      ).rejects.toThrow(CommentNotFoundError);
    });
  });

  describe('softDelete', () => {
    it('lets the author delete their own comment with byAdmin:false', async () => {
      modelCommentRepository.findById.mockResolvedValue(makeComment({ userId: 'author-1' }));

      await service.softDelete({ modelId: 'model-1', commentId: 'comment-1', caller: { id: 'author-1' } });

      expect(modelCommentRepository.softDeleteTx).toHaveBeenCalledOnce();
      expect(eventRepository.insert).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'model_comment.deleted',
          payload: expect.objectContaining({ byAdmin: false }),
        }),
      );
    });

    it('lets an admin delete someone else\'s comment with byAdmin:true', async () => {
      modelCommentRepository.findById.mockResolvedValue(makeComment({ userId: 'author-1' }));

      await service.softDelete({
        modelId: 'model-1',
        commentId: 'comment-1',
        caller: { id: 'admin-1', systemRole: 'admin' },
      });

      expect(eventRepository.insert).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ payload: expect.objectContaining({ byAdmin: true }) }),
      );
    });

    it('throws ForbiddenException for any other user', async () => {
      modelCommentRepository.findById.mockResolvedValue(makeComment({ userId: 'author-1' }));

      await expect(
        service.softDelete({ modelId: 'model-1', commentId: 'comment-1', caller: { id: 'random-user' } }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws CommentNotFoundError when the comment belongs to a different model', async () => {
      modelCommentRepository.findById.mockResolvedValue(makeComment({ modelId: 'other-model' }));

      await expect(
        service.softDelete({ modelId: 'model-1', commentId: 'comment-1', caller: { id: 'author-1' } }),
      ).rejects.toThrow(CommentNotFoundError);
    });
  });

  describe('like/unlike', () => {
    it('is idempotent across repeated likes and never writes an Event', async () => {
      modelCommentRepository.findById.mockResolvedValue(makeComment());
      modelCommentRepository.addLikeTx.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      await service.like({ modelId: 'model-1', commentId: 'comment-1', userId: 'liker-1' });
      await service.like({ modelId: 'model-1', commentId: 'comment-1', userId: 'liker-1' });

      expect(modelCommentRepository.addLikeTx).toHaveBeenCalledTimes(2);
      expect(eventRepository.insert).not.toHaveBeenCalled();
    });

    it('no-ops when unliking a comment that was not liked', async () => {
      modelCommentRepository.findById.mockResolvedValue(makeComment());
      modelCommentRepository.removeLikeTx.mockResolvedValue(false);

      await expect(
        service.unlike({ modelId: 'model-1', commentId: 'comment-1', userId: 'liker-1' }),
      ).resolves.toBeUndefined();

      expect(eventRepository.insert).not.toHaveBeenCalled();
    });

    it('throws CommentNotFoundError on like when the comment belongs to a different model', async () => {
      modelCommentRepository.findById.mockResolvedValue(makeComment({ modelId: 'other-model' }));

      await expect(
        service.like({ modelId: 'model-1', commentId: 'comment-1', userId: 'liker-1' }),
      ).rejects.toThrow(CommentNotFoundError);
    });

    it('throws CommentNotFoundError on unlike when the comment belongs to a different model', async () => {
      modelCommentRepository.findById.mockResolvedValue(makeComment({ modelId: 'other-model' }));

      await expect(
        service.unlike({ modelId: 'model-1', commentId: 'comment-1', userId: 'liker-1' }),
      ).rejects.toThrow(CommentNotFoundError);
    });
  });
});
