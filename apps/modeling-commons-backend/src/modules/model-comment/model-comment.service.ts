import env from '#src/config/env.ts';
import { CommentNotFoundError } from '#src/modules/model-comment/domain/model-comment.errors.ts';
import type {
  CommentAuthCaller,
  ModelCommentEntity,
} from '#src/modules/model-comment/domain/model-comment.types.ts';
import type { EmailModel } from '@repo/emails';

function truncatePreview(text: string, max = 280): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

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
  getModelCardQuery,
  mailService,
  mailDomain,
  logger,
}: Dependencies) {
  // A real unsubscribe/preferences endpoint doesn't exist yet, so links point at
  // the support inbox.
  async function buildEmailModel(modelId: string): Promise<EmailModel> {
    const fallback: EmailModel = { name: 'a model', url: `${env.product.website}/models/${modelId}` };
    try {
      const card = await getModelCardQuery.execute(modelId);
      return {
        name: card.latestVersion?.title ?? fallback.name,
        url: fallback.url,
        imageUrl: card.previewImageUrl ?? undefined,
        authorName: card.authors[0]?.userName ?? undefined,
      };
    } catch (error) {
      logger.error({
        name: 'ModelCommentService',
        message: 'Failed to load model card for a comment email',
        error,
      });
      return fallback;
    }
  }

  async function notifyOnNewComment(entity: ModelCommentEntity, parent?: ModelCommentEntity) {
    try {
      const unsubscribeUrl = `mailto:${env.product.supportEmail}`;
      const commentUrl = `${env.product.website}/models/${entity.modelId}/comments/${entity.id}`;
      const preview = truncatePreview(entity.content ?? '');

      const commenter = entity.userId ? await userRepository.findOneById(entity.userId) : null;
      const commenterName = commenter?.name ?? 'Someone';
      const model = await buildEmailModel(entity.modelId);

      // A reply notifies the parent's author with "replied to your comment". Model
      // authors get "commented on your model" — minus the commenter and minus the
      // parent author, who already received the more specific reply email.
      const parentAuthorId =
        parent?.userId && parent.userId !== entity.userId ? parent.userId : null;

      const authors = await modelAuthorRepository.findAllByModel(entity.modelId);
      const modelAuthorIds = new Set(authors.map((author) => author.userId));
      if (entity.userId) modelAuthorIds.delete(entity.userId);
      if (parentAuthorId) modelAuthorIds.delete(parentAuthorId);

      const jobs: Array<Promise<void>> = [];

      if (parentAuthorId) {
        jobs.push(
          (async () => {
            const recipient = await userRepository.findOneById(parentAuthorId);
            if (!recipient?.email) return;
            const content = await mailDomain.createRepliedToCommentEmail(
              recipient.email,
              recipient.name ?? 'there',
              commenterName,
              model,
              preview,
              commentUrl,
              unsubscribeUrl,
            );
            await mailService.sendMail(content);
          })(),
        );
      }

      for (const recipientId of modelAuthorIds) {
        jobs.push(
          (async () => {
            const recipient = await userRepository.findOneById(recipientId);
            if (!recipient?.email) return;
            const content = await mailDomain.createCommentedOnModelEmail(
              recipient.email,
              recipient.name ?? 'there',
              commenterName,
              model,
              preview,
              commentUrl,
              unsubscribeUrl,
            );
            await mailService.sendMail(content);
          })(),
        );
      }

      const results = await Promise.allSettled(jobs);
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

      await transactionManager.run(async (ctx) =>
        modelCommentRepository.addLikeTx(ctx, commentId, userId),
      );
    },

    async unlike({ modelId, commentId, userId }: CommentLikeInput): Promise<void> {
      await loadForModel(modelId, commentId);

      await transactionManager.run(async (ctx) =>
        modelCommentRepository.removeLikeTx(ctx, commentId, userId),
      );
    },
  };
}
