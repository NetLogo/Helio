export const modelCommentLiterals = {
  unknownActorName: 'Someone',
  unknownModelName: 'a model',

  categories: {
    'comment.on_your_model': {
      label: 'Comments on your models',
      description: 'When someone comments on a model you author.',
    },
    'comment.reply_to_you': {
      label: 'Replies to your comments',
      description: 'When someone replies directly to a comment you wrote.',
    },
  },

  formatReplyTitle: (actorName: string) => `${actorName} replied to your comment`,
  formatCommentTitle: (actorName: string) => `${actorName} commented on your model`,

  formatGroupLine: (actorList: string, modelName: string) =>
    `${actorList} commented on ${modelName}`,
} as const;
