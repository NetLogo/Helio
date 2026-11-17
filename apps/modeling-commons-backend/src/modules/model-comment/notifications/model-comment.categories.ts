export const modelCommentCategories = {
  replyToYou: 'comment.reply_to_you',
  onYourModel: 'comment.on_your_model',
} as const;

export type ModelCommentNotificationCategory =
  (typeof modelCommentCategories)[keyof typeof modelCommentCategories];

export type ModelCommentNotificationPayload = { commentId: string; excerpt: string };

export type ModelCommentNotificationPayloads = Record<
  ModelCommentNotificationCategory,
  ModelCommentNotificationPayload
>;
