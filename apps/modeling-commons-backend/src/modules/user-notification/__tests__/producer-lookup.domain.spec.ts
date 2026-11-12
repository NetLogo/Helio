import { describe, it, expect } from 'vitest';
import { notificationCategoryCatalog } from '#src/modules/notification-catalog.ts';
import { NotificationCategoryClaimError } from '#src/modules/user-notification/core/notification.errors.ts';
import producerLookupDomain, {
  mapModulesByCategory,
} from '#src/modules/user-notification/core/producer-lookup.domain.ts';
import { mockRegisteredNotificationModule } from '#src/modules/user-notification/__tests__/producer.mock.ts';

describe('mapModulesByCategory', () => {
  const onYourModel = mockRegisteredNotificationModule(
    {},
    {
      name: 'on-your-model',
      categories: { 'comment.on_your_model': notificationCategoryCatalog['comment.on_your_model'] },
    },
  );
  const replyToYou = mockRegisteredNotificationModule(
    {},
    {
      name: 'reply-to-you',
      categories: { 'comment.reply_to_you': notificationCategoryCatalog['comment.reply_to_you'] },
    },
  );
  const both = ['comment.on_your_model', 'comment.reply_to_you'] as const;

  it('maps each category to the one producer that claims it', () => {
    const byCategory = mapModulesByCategory(both, [onYourModel, replyToYou]);

    expect(byCategory['comment.on_your_model']).toBe(onYourModel);
    expect(byCategory['comment.reply_to_you']).toBe(replyToYou);
  });

  it('throws when a category is claimed by no producer', () => {
    expect(() => mapModulesByCategory(both, [onYourModel])).toThrow(NotificationCategoryClaimError);
  });

  it('throws when a category is claimed by two producers', () => {
    const alsoReplyToYou = { ...replyToYou, name: 'also-reply-to-you' };

    expect(() => mapModulesByCategory(both, [onYourModel, replyToYou, alsoReplyToYou])).toThrow(
      /comment.reply_to_you is claimed by 2 producers: reply-to-you, also-reply-to-you/,
    );
  });
});

describe('producerLookupDomain', () => {
  it('returns the producer of the module that claims a category', () => {
    const module = mockRegisteredNotificationModule();
    const lookup = producerLookupDomain({ registeredNotificationModules: [module] });

    expect(lookup.getProducer('comment.on_your_model')).toBe(module.producer);
  });

  it('fails to build when its producers leave a category unclaimed', () => {
    expect(() => producerLookupDomain({ registeredNotificationModules: [] })).toThrow(
      NotificationCategoryClaimError,
    );
  });
});
