import env from '#src/config/env.ts';
import { CommentNotFoundError } from '#src/modules/model-comment/domain/model-comment.errors.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import type {
  NotificationIntent,
  Notifier,
} from '#src/modules/user-notification/domain/user-notification.types.ts';
import type { EmailModel } from '@repo/emails';
import { truncatePreview } from '#src/shared/utils/formatters.ts';

export default function makeModelCommentNotifier({
  modelCommentRepository,
  modelAuthorRepository,
  userRepository,
  getModelCardQuery,
  mailDomain,
  logger,
}: Dependencies): Notifier {
  async function buildEmailModel(modelId: string): Promise<EmailModel> {
    const fallback: EmailModel = {
      name: 'a model',
      url: `${env.product.website}/models/${modelId}`,
    };
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
        name: 'ModelCommentNotifier',
        message: 'Failed to load model card for a comment email',
        error,
      });
      return fallback;
    }
  }

  return {
    eventTypes: ['model_comment.created'],

    async resolve(event: EventRecord): Promise<Array<NotificationIntent>> {
      const commentId = event.payload['commentId'] as string;
      const entity = await modelCommentRepository.findById(commentId);
      if (!entity) throw new CommentNotFoundError(commentId);

      const parent = entity.parentId
        ? await modelCommentRepository.findById(entity.parentId)
        : undefined;

      // A reply's own deep link opens it detached from the exchange it belongs to,
      // so the thread opens one level up and the new comment is highlighted inside it.
      const threadCommentId = parent?.id ?? entity.id;
      const threadUrl = new URL(
        `/models/${entity.modelId}/comments/${threadCommentId}`,
        env.product.website,
      );
      threadUrl.searchParams.set('highlightedCommentId', entity.id);
      const commentUrl = threadUrl.toString();
      const preview = truncatePreview(entity.content ?? '');

      const commenter = entity.userId ? await userRepository.findOneById(entity.userId) : null;
      const commenterName = commenter?.name ?? 'Someone';
      const model = await buildEmailModel(entity.modelId);

      // A reply notifies the parent's author with "replied to your comment". Model
      // authors get "commented on your model" - minus the commenter and minus the
      // parent author, who already received the more specific reply email.
      const parentAuthorId =
        parent?.userId && parent.userId !== entity.userId ? parent.userId : null;

      const authors = await modelAuthorRepository.findAllByModel(entity.modelId);
      const modelAuthorIds = new Set(authors.map((author) => author.userId));
      if (entity.userId) modelAuthorIds.delete(entity.userId);
      if (parentAuthorId) modelAuthorIds.delete(parentAuthorId);

      const intents: Array<NotificationIntent> = [];

      if (parentAuthorId) {
        intents.push({
          recipientUserId: parentAuthorId,
          category: 'comment.reply_to_you',
          title: `${commenterName} replied to your comment`,
          body: preview,
          url: commentUrl,
          buildEmail: async (recipient, links) =>
            mailDomain.createRepliedToCommentEmail(
              recipient.email,
              recipient.name ?? 'there',
              commenterName,
              model,
              preview,
              commentUrl,
              links.unsubscribeUrl,
            ),
        });
      }

      for (const recipientId of modelAuthorIds) {
        intents.push({
          recipientUserId: recipientId,
          category: 'comment.on_your_model',
          title: `${commenterName} commented on your model`,
          body: preview,
          url: commentUrl,
          buildEmail: async (recipient, links) =>
            mailDomain.createCommentedOnModelEmail(
              recipient.email,
              recipient.name ?? 'there',
              commenterName,
              model,
              preview,
              commentUrl,
              links.unsubscribeUrl,
            ),
        });
      }

      return intents;
    },
  };
}
