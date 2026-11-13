import {
  modelCommentCategories,
  type ModelCommentNotificationCategory,
} from '#src/modules/model-comment/notifications/model-comment.categories.ts';

export type CommentNotificationRecipient = {
  recipientId: string;
  category: ModelCommentNotificationCategory;
};

export type CommentNotificationParticipants = {
  commenterId: string | null;
  parentAuthorId: string | null;
  modelAuthorIds: ReadonlyArray<string>;
};

export function selectCommentRecipients({
  commenterId,
  parentAuthorId,
  modelAuthorIds,
}: CommentNotificationParticipants): Array<CommentNotificationRecipient> {
  let parentAuthorToNotify: string | null = null;
  if (parentAuthorId && parentAuthorId !== commenterId) parentAuthorToNotify = parentAuthorId;

  const modelAuthorsToNotify = new Set(modelAuthorIds);
  if (commenterId) modelAuthorsToNotify.delete(commenterId);
  if (parentAuthorToNotify) modelAuthorsToNotify.delete(parentAuthorToNotify);

  const recipients: Array<CommentNotificationRecipient> = [];
  if (parentAuthorToNotify) {
    recipients.push({
      recipientId: parentAuthorToNotify,
      category: modelCommentCategories.replyToYou,
    });
  }
  for (const recipientId of modelAuthorsToNotify) {
    recipients.push({ recipientId, category: modelCommentCategories.onYourModel });
  }

  return recipients;
}
