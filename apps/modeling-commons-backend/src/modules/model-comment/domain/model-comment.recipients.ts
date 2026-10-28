import type { modelCommentNotificationCategories } from '#src/modules/model-comment/notifications/model-comment.categories.ts';

export type ModelCommentNotificationCategory = keyof typeof modelCommentNotificationCategories;

export type CommentNotificationRecipient = {
  recipientId: string;
  category: ModelCommentNotificationCategory;
  title: string;
};

export type CommentNotificationParticipants = {
  commenterId: string | null;
  commenterName: string;
  parentAuthorId: string | null;
  modelAuthorIds: Iterable<string>;
};

export function formatCommenterName(name: string | null | undefined): string {
  return name ?? 'Someone';
}

export function formatCommentNotificationTitle(
  category: ModelCommentNotificationCategory,
  commenterName: string,
): string {
  return category === 'comment.reply_to_you'
    ? `${commenterName} replied to your comment`
    : `${commenterName} commented on your model`;
}

export function listCommentNotificationRecipients({
  commenterId,
  commenterName,
  parentAuthorId,
  modelAuthorIds,
}: CommentNotificationParticipants): Array<CommentNotificationRecipient> {
  const repliedToId = parentAuthorId && parentAuthorId !== commenterId ? parentAuthorId : null;

  // The parent's author already gets the more specific reply, so the model notice skips them.
  const authorIds = new Set(modelAuthorIds);
  if (commenterId) authorIds.delete(commenterId);
  if (repliedToId) authorIds.delete(repliedToId);

  const recipients: Array<{ recipientId: string; category: ModelCommentNotificationCategory }> = [];
  if (repliedToId) recipients.push({ recipientId: repliedToId, category: 'comment.reply_to_you' });
  for (const recipientId of authorIds) {
    recipients.push({ recipientId, category: 'comment.on_your_model' });
  }

  return recipients.map((recipient) => ({
    ...recipient,
    title: formatCommentNotificationTitle(recipient.category, commenterName),
  }));
}
