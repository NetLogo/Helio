import links from '#src/config/links.ts';
import { modelCommentEventTypes } from '#src/modules/event/domain/event-types.ts';
import { listCommentNotificationRecipients } from '#src/modules/model-comment/notifications/model-comment.recipients.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import { modelCommentLiterals } from '#src/modules/model-comment/notifications/model-comment.literals.ts';
import { modelCommentNotifications } from '#src/modules/model-comment/notifications/model-comment.notifications.ts';
import type {
  NotificationRowFacts,
  NotificationPreviews,
  NotificationProducer,
  NotificationRedaction,
  NotificationRow,
  NotificationTargetRef,
} from '#src/modules/user-notification/domain/user-notification.types.ts';
import type { EmailModel } from '@repo/emails';
import { formatUserList, truncatePreview } from '#src/shared/utils/formatters.ts';

function isReply(row: Pick<NotificationRow, 'category'>): boolean {
  return row.category === 'comment.reply_to_you';
}

function getActorName(preview: NotificationPreviews): string {
  return preview.actor?.name ?? modelCommentLiterals.unknownActorName;
}

function canReadTarget(preview: NotificationPreviews): boolean {
  return Boolean(preview.target?.name);
}

function readCommentExcerpt(payload: NotificationRow['payload']): string {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return '';
  const excerpt = payload['excerpt'];
  return typeof excerpt === 'string' ? excerpt : '';
}

export default function makeModelCommentProducer({
  modelCommentRepository,
  modelAuthorRepository,
  userDomain,
  mailDomain,
}: Dependencies): NotificationProducer {
  return {
    name: 'model-comment',
    eventTypes: modelCommentNotifications.eventTypes,
    categories: modelCommentNotifications.categories,

    async resolve(event: EventRecord): Promise<Array<NotificationRowFacts>> {
      if (event.type !== modelCommentEventTypes.created) return [];
      const commentId = event.payload['commentId'] as string;
      const entity = await modelCommentRepository.findById(commentId);
      if (!entity || entity.deletedAt !== null) return [];

      const parent = entity.parentId
        ? await modelCommentRepository.findById(entity.parentId)
        : undefined;

      const enclosingThreadId = parent?.id ?? entity.id;
      const commentUrl = links.modelComment(entity.modelId, enclosingThreadId, entity.id);
      const excerpt = truncatePreview(entity.content ?? '');

      const target: NotificationTargetRef = { type: 'model', id: entity.modelId };

      const authors = await modelAuthorRepository.findAllByModel(entity.modelId);
      const recipients = listCommentNotificationRecipients({
        commenterId: entity.userId,
        parentAuthorId: parent?.userId ?? null,
        modelAuthorIds: authors.map((author) => author.userId),
      });

      return recipients.map(({ recipientId, category }) => ({
        recipientUserId: recipientId,
        category,
        url: commentUrl,
        payload: { commentId: entity.id, excerpt },
        actorUserId: entity.userId ?? undefined,
        target,
      }));
    },

    redact(event: EventRecord): NotificationRedaction | undefined {
      if (event.type !== modelCommentEventTypes.deleted) return undefined;
      return {
        match: { key: 'commentId', value: event.payload['commentId'] as string },
        fields: ['excerpt'],
      };
    },

    describeRow(row, preview) {
      const actorName = getActorName(preview);
      return {
        title: isReply(row)
          ? modelCommentLiterals.formatReplyTitle(actorName)
          : modelCommentLiterals.formatCommentTitle(actorName),
        body: canReadTarget(preview) ? readCommentExcerpt(row.payload) : '',
      };
    },

    async renderEmail(row, recipient, preview, emailLinks) {
      const model: EmailModel = {
        name: preview.target?.name ?? modelCommentLiterals.unknownModelName,
        url: preview.target?.url ?? row.url,
        imageUrl: preview.target?.thumbnailUrl ?? undefined,
      };
      const args = [
        recipient.email,
        userDomain.formatGreetingName(recipient),
        getActorName(preview),
        model,
        readCommentExcerpt(row.payload),
        row.url,
        emailLinks.unsubscribeUrl,
      ] as const;
      return isReply(row)
        ? mailDomain.createRepliedToCommentEmail(...args)
        : mailDomain.createCommentedOnModelEmail(...args);
    },

    describeGroup(group, previews) {
      const [newest] = group.rows;
      const target = newest ? previews.get(newest.id)?.target : undefined;
      if (!target?.name) return undefined;

      const names = group.actors
        .map((actor) => previews.get(actor.rowId)?.actor?.name)
        .filter((name): name is string => Boolean(name));
      const actorList = formatUserList(names, Math.max(group.actors.length, 1));
      return {
        text: modelCommentLiterals.formatGroupLine(actorList, target.name),
        url: target.url,
      };
    },
  };
}
