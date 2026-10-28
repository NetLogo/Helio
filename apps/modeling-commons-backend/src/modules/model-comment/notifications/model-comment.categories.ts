export const modelCommentNotificationCategories = {
  'comment.on_your_model': {
    label: 'Comments on your models',
    description: 'When someone comments on a model you author.',
    defaults: { email: 'immediate', inApp: true },
  },
  'comment.reply_to_you': {
    label: 'Replies to your comments',
    description: 'When someone replies directly to a comment you wrote.',
    defaults: { email: 'immediate', inApp: true },
  },
} as const;
