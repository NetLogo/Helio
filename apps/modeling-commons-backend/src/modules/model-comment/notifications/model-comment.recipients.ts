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

  const modelNoticeRecipientIds = new Set(modelAuthorIds);
  if (commenterId) modelNoticeRecipientIds.delete(commenterId);
  if (repliedToId) modelNoticeRecipientIds.delete(repliedToId);

  const recipients: Array<CommentNotificationRecipient> = [];
  if (repliedToId) recipients.push({ recipientId: repliedToId, category: 'comment.reply_to_you' });
  for (const recipientId of modelNoticeRecipientIds) {
    recipients.push({ recipientId, category: 'comment.on_your_model' });
  }

  return recipients;
}
