import { modelCommentEventTypes } from '#src/modules/event/domain/event-types.ts';
import { modelCommentLiterals } from '#src/modules/model-comment/notifications/model-comment.literals.ts';

export const modelCommentNotifications = {
  producer: (deps: Dependencies) => deps.modelCommentProducer,
  eventTypes: [modelCommentEventTypes.created, modelCommentEventTypes.deleted],
  categories: {
    'comment.on_your_model': {
      ...modelCommentLiterals.categories['comment.on_your_model'],
      defaults: { email: 'immediate', inApp: true },
    },
    'comment.reply_to_you': {
      ...modelCommentLiterals.categories['comment.reply_to_you'],
      defaults: { email: 'immediate', inApp: true },
    },
  },
} as const;
