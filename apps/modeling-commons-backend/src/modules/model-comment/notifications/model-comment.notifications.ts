import { modelCommentEventTypes } from '#src/modules/model-comment/model-comment.events.ts';
import { modelCommentLiterals } from '#src/modules/model-comment/notifications/model-comment.literals.ts';

import makeModelCommentProducer from '#src/modules/model-comment/notifications/model-comment.producer.ts';
import { modelCommentCategories } from '#src/modules/model-comment/notifications/model-comment.categories.ts';

export const modelCommentNotifications = {
  name: 'model-comment',
  producer: makeModelCommentProducer,
  eventTypes: [modelCommentEventTypes.created, modelCommentEventTypes.deleted],
  categories: {
    [modelCommentCategories.onYourModel]: {
      ...modelCommentLiterals.categories[modelCommentCategories.onYourModel],
      defaults: { email: 'immediate', inApp: true },
    },
    [modelCommentCategories.replyToYou]: {
      ...modelCommentLiterals.categories[modelCommentCategories.replyToYou],
      defaults: { email: 'immediate', inApp: true },
    },
  },
} as const;
