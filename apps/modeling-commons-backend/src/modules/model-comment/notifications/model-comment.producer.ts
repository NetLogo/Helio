import links from '#src/config/links.ts';
import { modelCommentEventTypes } from '#src/modules/model-comment/model-comment.events.ts';
import { selectCommentRecipients } from '#src/modules/model-comment/notifications/model-comment.recipients.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import { modelCommentCategories } from '#src/modules/model-comment/notifications/model-comment.categories.ts';
import { modelCommentLiterals } from '#src/modules/model-comment/notifications/model-comment.literals.ts';
import type {
  NewNotificationPayload,
  Notification,
  NotificationProducer,
  NotificationRedaction,
  NotificationSubjects,
  NotificationTargetRef,
} from '#src/modules/user-notification/core/types/index.ts';
import type { EmailModel } from '@repo/emails';
import { formatUserList, truncatePreview } from '#src/shared/utils/formatters.ts';

function isReply(notification: Pick<Notification, 'category'>): boolean {
  return notification.category === modelCommentCategories.replyToYou;
}

function getActorName(subjects: NotificationSubjects): string {
  return subjects.actor?.name ?? modelCommentLiterals.unknownActorName;
}

export default function makeModelCommentProducer({
  modelCommentRepository,
  modelAuthorRepository,
  userDomain,
  mailDomain,
}: Dependencies): NotificationProducer {
  return {
    async buildNotifications(event: EventRecord): Promise<Array<NewNotificationPayload>> {
      if (event.type !== modelCommentEventTypes.created) return [];
      const { commentId } = event.payload;
      const comment = await modelCommentRepository.findById(commentId);
      if (!comment || comment.deletedAt !== null) return [];

      const parentComment = comment.parentId
        ? await modelCommentRepository.findById(comment.parentId)
        : undefined;

      const threadRootId = comment.parentId ?? comment.id;
      const commentUrl = links.modelComment(comment.modelId, threadRootId, comment.id);
      const excerpt = truncatePreview(comment.content ?? '');

      const target: NotificationTargetRef = { type: 'model', id: comment.modelId };

      const authors = await modelAuthorRepository.findAllByModel(comment.modelId);
      const recipients = selectCommentRecipients({
        commenterId: comment.userId,
        parentAuthorId: parentComment?.userId ?? null,
        modelAuthorIds: authors.map((author) => author.userId),
      });

      return recipients.map((recipient) => ({
        ...recipient,
        url: commentUrl,
        payload: { commentId: comment.id, excerpt },
        actorId: comment.userId ?? undefined,
        target,
      }));
    },

    findRedaction(event: EventRecord): NotificationRedaction | undefined {
      if (event.type !== modelCommentEventTypes.deleted) return undefined;
      return {
        match: { payloadKey: 'commentId', value: event.payload.commentId },
        payloadFields: ['excerpt'],
      };
    },

    describeFeedItem(notification, subjects) {
      const actorName = getActorName(subjects);
      return {
        title: isReply(notification)
          ? modelCommentLiterals.formatReplyTitle(actorName)
          : modelCommentLiterals.formatCommentTitle(actorName),
        body: subjects.target !== null ? notification.payload.excerpt : '',
      };
    },

    async renderEmail(notification, recipient, subjects, emailLinks) {
      const model: EmailModel = {
        name: subjects.target?.name ?? modelCommentLiterals.unknownModelName,
        url: subjects.target?.url ?? notification.url,
        imageUrl: subjects.target?.thumbnailUrl ?? undefined,
      };
      const options = {
        userEmail: recipient.email,
        userName: userDomain.formatGreetingName(recipient),
        actorName: getActorName(subjects),
        model,
        commentPreview: notification.payload.excerpt,
        commentUrl: notification.url,
        unsubscribeUrl: emailLinks.unsubscribeUrl,
      };
      return isReply(notification)
        ? mailDomain.createRepliedToCommentEmail(options)
        : mailDomain.createCommentedOnModelEmail(options);
    },

    describeDigestItem(group, subjects) {
      const [newest] = group.notifications;
      const target = newest ? subjects.of(newest.id)?.target : undefined;
      if (!target?.name) return undefined;

      const names = group.actors
        .map((actor) => subjects.of(actor.notificationId)?.actor?.name)
        .filter((name): name is string => Boolean(name));
      const actorList = formatUserList(names, Math.max(group.actors.length, 1));
      return {
        text: modelCommentLiterals.formatGroupLine(actorList, target.name),
        url: target.url,
      };
    },
  };
}
