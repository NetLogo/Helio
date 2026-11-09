import type { modelCommentNotifications } from '#src/modules/model-comment/notifications/model-comment.notifications.ts';

export type ModelCommentNotificationCategory = keyof typeof modelCommentNotifications.categories;

export type CommentNotificationRecipient = {
  recipientId: string;
  category: ModelCommentNotificationCategory;
};

export type CommentNotificationParticipants = {
  commenterId: string | null;
  parentAuthorId: string | null;
  modelAuthorIds: Iterable<string>;
};

export function listCommentNotificationRecipients({
  commenterId,
  parentAuthorId,
  modelAuthorIds,
}: CommentNotificationParticipants): Array<CommentNotificationRecipient> {
  const repliedToId = parentAuthorId && parentAuthorId !== commenterId ? parentAuthorId : null;

  // The parent's author already gets the more specific reply, so the model notice skips them.
  const authorIds = new Set(modelAuthorIds);
  if (commenterId) authorIds.delete(commenterId);
  if (repliedToId) authorIds.delete(repliedToId);

  const recipients: Array<CommentNotificationRecipient> = [];
  if (repliedToId) recipients.push({ recipientId: repliedToId, category: 'comment.reply_to_you' });
  for (const recipientId of authorIds) {
    recipients.push({ recipientId, category: 'comment.on_your_model' });
  }

  return recipients;
}
