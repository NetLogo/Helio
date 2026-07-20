import env from '#src/config/env.ts';
import { CommentNotFoundError } from '#src/modules/model-comment/domain/model-comment.errors.ts';
import type {
  CommentAuthCaller,
  ModelCommentEntity,
} from '#src/modules/model-comment/domain/model-comment.types.ts';

export type CreateCommentInput = {
  modelId: string;
  userId: string;
  parentId?: string;
  versionNumber?: number;
  content: string;
};

export type UpdateCommentContentInput = {
  modelId: string;
  commentId: string;
  callerId: string;
  content: string;
};

export type SoftDeleteCommentInput = {
  modelId: string;
  commentId: string;
  caller: CommentAuthCaller;
};

export type CommentLikeInput = {
  modelId: string;
  commentId: string;
  userId: string;
};

export default function makeModelCommentService({
  transactionManager,
  modelCommentRepository,
  modelCommentDomain,
  eventRepository,
  modelAuthorRepository,
  userRepository,
  mailService,
  mailDomain,
  logger,
}: Dependencies) {
  // No dedicated "new comment" template yet (plan §15 item 5 is polish); until a
  // real unsubscribe/preferences endpoint exists, point at the support inbox.
  async function notifyOnNewComment(entity: ModelCommentEntity, parent?: ModelCommentEntity) {
    try {
      const authors = await modelAuthorRepository.findAllByModel(entity.modelId);
      const recipientIds = new Set(authors.map((author) => author.userId));
      if (parent?.userId && parent.userId !== entity.userId) {
        recipientIds.add(parent.userId);
      }
      if (entity.userId) {
        recipientIds.delete(entity.userId);
      }

      const results = await Promise.allSettled(
        Array.from(recipientIds).map(async (recipientId) => {
          const recipient = await userRepository.findOneById(recipientId);
          if (!recipient?.email) return;

          const content = await mailDomain.createNotificationEmail(
            recipient.email,
            recipient.name ?? 'there',
            'Someone commented on a model you are involved with.',
            `mailto:${env.product.supportEmail}`,
          );
          await mailService.sendMail(content);
        }),
      );

      for (const result of results) {
        if (result.status === 'rejected') {
          logger.error({
            name: 'ModelCommentService',
            message: 'Failed to notify a comment recipient',
            error: result.reason,
          });
        }
      }
    } catch (error) {
      logger.error({
        name: 'ModelCommentService',
        message: 'Failed to notify comment authors',
        error,
      });
    }
  }

  async function loadForModel(modelId: string, commentId: string): Promise<ModelCommentEntity> {
    const comment = await modelCommentRepository.findById(commentId);
    if (!comment || comment.modelId !== modelId) {
      throw new CommentNotFoundError(commentId);
    }
    return comment;
  }

  return {
    async create({
      modelId,
      userId,
      parentId,
      versionNumber,
      content,
    }: CreateCommentInput): Promise<{ id: string }> {
      let parent: ModelCommentEntity | undefined;
      if (parentId) {
        parent = await modelCommentRepository.findById(parentId);
        if (!parent) throw new CommentNotFoundError(parentId);
        modelCommentDomain.assertNotDeleted(parent);
        modelCommentDomain.assertParentMatchesModel(parent, modelId);
      }

      const entity = modelCommentDomain.createComment({
        modelId,
        userId,
        parentId,
        versionNumber: parentId ? undefined : versionNumber,
        content,
      });

      await transactionManager.run(async (ctx) => {
        await modelCommentRepository.insertTx(ctx, entity);
        await eventRepository.insert(ctx, {
          type: 'model_comment.created',
          actorId: userId,
          resourceType: 'model',
          resourceId: modelId,
          payload: { commentId: entity.id, parentId: parentId ?? null },
        });
      });

      void notifyOnNewComment(entity, parent);

      return { id: entity.id };
    },

    async updateContent({
      modelId,
      commentId,
      callerId,
      content,
    }: UpdateCommentContentInput): Promise<void> {
      const comment = await loadForModel(modelId, commentId);
      modelCommentDomain.assertNotDeleted(comment);
      modelCommentDomain.assertCanEdit(comment, callerId);

      const now = new Date();
      await transactionManager.run(async (ctx) => {
        await modelCommentRepository.updateContentTx(ctx, commentId, content, now);
        await eventRepository.insert(ctx, {
          type: 'model_comment.updated',
          actorId: callerId,
          resourceType: 'model',
          resourceId: modelId,
          payload: { commentId },
        });
      });
    },

    async softDelete({ modelId, commentId, caller }: SoftDeleteCommentInput): Promise<void> {
      const comment = await loadForModel(modelId, commentId);
      modelCommentDomain.assertNotDeleted(comment);
      modelCommentDomain.assertCanDelete(comment, caller);

      const now = new Date();
      await transactionManager.run(async (ctx) => {
        await modelCommentRepository.softDeleteTx(ctx, commentId, now);
        await eventRepository.insert(ctx, {
          type: 'model_comment.deleted',
          actorId: caller.id,
          resourceType: 'model',
          resourceId: modelId,
          payload: { commentId, byAdmin: caller.systemRole === 'admin' },
        });
      });
    },

    async like({ modelId, commentId, userId }: CommentLikeInput): Promise<void> {
      const comment = await loadForModel(modelId, commentId);
      modelCommentDomain.assertNotDeleted(comment);

      await transactionManager.run((ctx) => modelCommentRepository.addLikeTx(ctx, commentId, userId));
    },

    async unlike({ modelId, commentId, userId }: CommentLikeInput): Promise<void> {
      await loadForModel(modelId, commentId);

      await transactionManager.run((ctx) => modelCommentRepository.removeLikeTx(ctx, commentId, userId));
    },
  };
}
