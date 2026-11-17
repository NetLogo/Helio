import { modelCommentCategories } from '#src/modules/model-comment/notifications/model-comment.categories.ts';

export const modelCommentLiterals = {
  unknownActorName: 'Someone',
  unknownModelName: 'a model',

  categories: {
    [modelCommentCategories.onYourModel]: {
      label: 'Comments on your models',
      description: 'When someone comments on a model you author.',
    },
    [modelCommentCategories.replyToYou]: {
      label: 'Replies to your comments',
      description: 'When someone replies directly to a comment you wrote.',
    },
  },

  formatReplyTitle: (actorName: string) => `${actorName} replied to your comment`,
  formatCommentTitle: (actorName: string) => `${actorName} commented on your model`,

  formatGroupLine: (actorList: string, modelName: string) =>
    `${actorList} commented on ${modelName}`,
} as const;
