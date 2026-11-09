import { describe, it, expect } from 'vitest';
import notificationsConfig from '#src/config/notifications.ts';
import { notificationCategoryCatalog } from '#src/modules/notification-producers.ts';
import userNotificationDomain, {
  mapProducersByCategory,
} from '#src/modules/user-notification/domain/user-notification.domain.ts';
import { mockNotificationProducer } from '#src/modules/user-notification/domain/notification-producer.mock.ts';
import {
  NotificationCategoryClaimError,
  NotificationNotFoundError,
} from '#src/modules/user-notification/domain/user-notification.errors.ts';
import type {
  NotificationRow,
  EmailMode,
  NotificationChannels,
  NotificationRowFacts,
} from '#src/modules/user-notification/domain/user-notification.types.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import type { UserEntity } from '#src/modules/user/domain/user.types.ts';

const domain = userNotificationDomain({ notificationProducers: [mockNotificationProducer()] });

describe('userNotificationDomain', () => {
  describe('categories', () => {
    it('exposes exactly the two known categories', () => {
      const names = domain.categories.map((c) => c.category).sort();
      expect(names).toEqual(['comment.on_your_model', 'comment.reply_to_you'].sort());
    });

    it('gives every category a label and a description', () => {
      for (const info of domain.categories) {
        expect(info.label.length).toBeGreaterThan(0);
        expect(info.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('isKnownCategory', () => {
    it('accepts every catalog category', () => {
      for (const info of domain.categories) {
        expect(domain.isKnownCategory(info.category)).toBe(true);
      }
    });

    it('rejects an unknown category', () => {
      expect(domain.isKnownCategory('comment.mentions_you')).toBe(false);
      expect(domain.isKnownCategory('')).toBe(false);
    });
  });

  describe('resolvePreference', () => {
    it.each(domain.categories.map((info) => [info.category, info.defaults] as const))(
      'falls back to the catalog defaults for %s when there is no override',
      (category, defaults) => {
        expect(domain.resolvePreference(category)).toEqual(defaults);
        expect(domain.resolvePreference(category, null)).toEqual(defaults);
      },
    );

    function otherMode(mode: EmailMode): EmailMode {
      return mode === 'daily' ? 'off' : 'daily';
    }

    it('applies an override for both channels', () => {
      const { category, defaults } = domain.categories[0]!;
      const opposite = { email: otherMode(defaults.email), inApp: !defaults.inApp };
      expect(domain.resolvePreference(category, opposite)).toEqual(opposite);
    });

    it('merges a partial override, keeping the default for the omitted channel', () => {
      const { category, defaults } = domain.categories[0]!;
      expect(domain.resolvePreference(category, { email: otherMode(defaults.email) })).toEqual({
        email: otherMode(defaults.email),
        inApp: defaults.inApp,
      });
      expect(domain.resolvePreference(category, { inApp: !defaults.inApp })).toEqual({
        email: defaults.email,
        inApp: !defaults.inApp,
      });
    });
  });
});

describe('userNotificationDomain feed helpers', () => {
  describe('listInAppEnabledCategories', () => {
    it('falls back to the catalog defaults when the user has no overrides', () => {
      expect(domain.listInAppEnabledCategories([])).toEqual(
        domain.categories.filter((info) => info.defaults.inApp).map((info) => info.category),
      );
    });

    it('drops a category the user muted in-app', () => {
      const result = domain.listInAppEnabledCategories([
        { category: 'comment.on_your_model', inApp: false },
      ]);

      expect(result).not.toContain('comment.on_your_model');
    });

    it('ignores an override that only touches the email channel', () => {
      const result = domain.listInAppEnabledCategories([
        { category: 'comment.on_your_model', email: 'off' },
      ]);

      expect(result).toContain('comment.on_your_model');
    });
  });

  describe('assertOwnedByRecipient', () => {
    it('accepts a notification addressed to the caller', () => {
      expect(() =>
        domain.assertOwnedByRecipient(
          { id: 'notification-1', recipientId: 'user-1' },
          'notification-1',
          'user-1',
        ),
      ).not.toThrow();
    });

    it('rejects a missing notification', () => {
      expect(() => domain.assertOwnedByRecipient(undefined, 'notification-1', 'user-1')).toThrow(
        NotificationNotFoundError,
      );
    });

    it('rejects a notification addressed to someone else', () => {
      expect(() =>
        domain.assertOwnedByRecipient(
          { id: 'notification-1', recipientId: 'other-user' },
          'notification-1',
          'user-1',
        ),
      ).toThrow(NotificationNotFoundError);
    });
  });
});

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    emailVerified: true,
    image: null,
    systemRole: 'user',
    userKind: 'researcher',
    isProfilePublic: true,
    onboardedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    banned: null,
    banReason: null,
    banExpires: null,
    bio: null,
    country: null,
    socialLinks: null,
    dob: null,
    affiliation: null,
    role: null,
    legacyId: null,
    ...overrides,
  };
}

function makeEvent(): EventRecord {
  return {
    id: 'event-1',
    type: 'model_comment.created',
    actorId: 'actor-1',
    resourceType: 'model',
    resourceId: 'model-1',
    payload: {},
    createdAt: new Date('2026-01-01'),
  };
}

function makeRowFacts(overrides: Partial<NotificationRowFacts> = {}): NotificationRowFacts {
  return {
    recipientUserId: 'recipient-1',
    category: 'comment.on_your_model',
    url: 'https://example.test/models/model-1',
    payload: { commentId: 'comment-1', excerpt: 'Nice model' },
    ...overrides,
  };
}

describe('userNotificationDomain delivery helpers', () => {
  describe('listInAppRecipientIds', () => {
    it('lists each recipient once whose ledger row shows in the feed', () => {
      const ids = domain.listInAppRecipientIds([
        { recipientId: 'a', inAppSuppressed: false },
        { recipientId: 'b', inAppSuppressed: true },
        { recipientId: 'a', inAppSuppressed: false },
        { recipientId: 'c', inAppSuppressed: false },
      ]);

      expect(ids).toEqual(['a', 'c']);
    });

    it('lists nobody when every row is suppressed', () => {
      expect(domain.listInAppRecipientIds([{ recipientId: 'a', inAppSuppressed: true }])).toEqual(
        [],
      );
    });
  });

  describe('isDeliverableRecipient', () => {
    it('accepts an active recipient with an email address', () => {
      expect(domain.isDeliverableRecipient(makeUser())).toBe(true);
    });

    it('rejects a missing recipient', () => {
      expect(domain.isDeliverableRecipient(undefined)).toBe(false);
    });

    it('rejects a deleted recipient', () => {
      expect(domain.isDeliverableRecipient(makeUser({ deletedAt: new Date() }))).toBe(false);
    });

    it('rejects a banned recipient', () => {
      expect(domain.isDeliverableRecipient(makeUser({ banned: true }))).toBe(false);
    });

    it('rejects a recipient without an email address', () => {
      expect(domain.isDeliverableRecipient(makeUser({ email: null }))).toBe(false);
    });
  });

  describe('isSuppressed', () => {
    it('suppresses when both channels are off', () => {
      expect(domain.isSuppressed({ email: 'off', inApp: false })).toBe(true);
    });

    it.each<NotificationChannels>([
      { email: 'immediate', inApp: false },
      { email: 'daily', inApp: false },
      { email: 'off', inApp: true },
      { email: 'immediate', inApp: true },
    ])('does not suppress when a channel is on: %o', (channels) => {
      expect(domain.isSuppressed(channels)).toBe(false);
    });
  });

  describe('isSendableNow', () => {
    it('is true only for the immediate email mode', () => {
      expect(domain.isSendableNow({ email: 'immediate', inApp: false })).toBe(true);
      expect(domain.isSendableNow({ email: 'daily', inApp: true })).toBe(false);
      expect(domain.isSendableNow({ email: 'off', inApp: true })).toBe(false);
    });
  });

  describe('createLedgerRow', () => {
    it('maps an intent with an actor and a target to their reference columns', () => {
      const row = domain.createLedgerRow(
        makeEvent(),
        'recipient-1',
        makeRowFacts({ actorUserId: 'actor-1', target: { type: 'model', id: 'model-1' } }),
        { email: 'immediate', inApp: true },
      );

      expect(row).toEqual({
        recipientId: 'recipient-1',
        eventId: 'event-1',
        category: 'comment.on_your_model',
        url: 'https://example.test/models/model-1',
        payload: { commentId: 'comment-1', excerpt: 'Nice model' },
        actorUserId: 'actor-1',
        targetType: 'model',
        targetId: 'model-1',
        inAppSuppressed: false,
      });
    });

    it('writes null reference columns for an intent with neither actor nor target', () => {
      const row = domain.createLedgerRow(makeEvent(), 'recipient-1', makeRowFacts(), {
        email: 'immediate',
        inApp: true,
      });

      expect(row).toMatchObject({ actorUserId: null, targetType: null, targetId: null });
    });
  });

  describe('isRead', () => {
    it('is true once readAt is set', () => {
      expect(domain.isRead({ readAt: new Date() })).toBe(true);
    });

    it('is false for an unread notification', () => {
      expect(domain.isRead({ readAt: null })).toBe(false);
    });

    it('is false for a missing notification', () => {
      expect(domain.isRead(undefined)).toBe(false);
    });
  });
});

describe('userNotificationDomain digest helpers', () => {
  function makeNotificationRow(
    id: string,
    category: string,
    createdAt: string,
    overrides: Partial<NotificationRow> = {},
  ): NotificationRow {
    return {
      id,
      category,
      url: `https://example.test/${id}`,
      payload: {},
      actorUserId: null,
      targetType: null,
      targetId: null,
      createdAt: new Date(createdAt),
      ...overrides,
    };
  }

  describe('listFlushedCategories', () => {
    it.each<[EmailMode, EmailMode]>([
      ['daily', 'immediate'],
      ['off', 'immediate'],
      ['immediate', 'daily'],
      ['off', 'daily'],
    ])('lists a category switched from %s to %s', (previous, next) => {
      expect(
        domain.listFlushedCategories(
          { 'comment.on_your_model': previous },
          { 'comment.on_your_model': next },
        ),
      ).toEqual(['comment.on_your_model']);
    });

    it.each<[EmailMode, EmailMode]>([
      ['immediate', 'immediate'],
      ['daily', 'daily'],
      ['off', 'off'],
      ['daily', 'off'],
      ['immediate', 'off'],
    ])('lists nothing for %s to %s', (previous, next) => {
      expect(
        domain.listFlushedCategories(
          { 'comment.on_your_model': previous },
          { 'comment.on_your_model': next },
        ),
      ).toEqual([]);
    });

    it('lists every switched category', () => {
      expect(
        domain
          .listFlushedCategories(
            { 'comment.on_your_model': 'daily', 'comment.reply_to_you': 'daily' },
            { 'comment.on_your_model': 'immediate', 'comment.reply_to_you': 'immediate' },
          )
          .sort(),
      ).toEqual(['comment.on_your_model', 'comment.reply_to_you']);
    });
  });

  describe('getDigestWindow', () => {
    it('spans from windowMs before now to minAgeMs before now', () => {
      const now = new Date('2026-01-02T17:00:00Z');

      expect(domain.getDigestWindow(now)).toEqual({
        since: new Date(now.getTime() - notificationsConfig.windowMs),
        until: new Date(now.getTime() - notificationsConfig.minAgeMs),
      });
    });

    it('covers 25 hours up to 5 minutes ago', () => {
      const { since, until } = domain.getDigestWindow(new Date('2026-01-02T17:00:00Z'));

      expect(since).toEqual(new Date('2026-01-01T16:00:00Z'));
      expect(until).toEqual(new Date('2026-01-02T16:55:00Z'));
    });
  });

  describe('getFlushWindow', () => {
    it('covers the last 25 hours up to now, with no minimum age', () => {
      const now = new Date('2026-01-02T17:00:00Z');

      expect(domain.getFlushWindow(now)).toEqual({
        since: new Date('2026-01-01T16:00:00Z'),
        until: now,
      });
    });
  });

  describe('listDailyCategories', () => {
    it('lists categories whose resolved email mode is daily', () => {
      expect(
        domain.listDailyCategories([
          { category: 'comment.on_your_model', email: 'daily' },
          { category: 'comment.reply_to_you', email: 'off' },
        ]),
      ).toEqual(['comment.on_your_model']);
    });

    it('lists nothing for a user on the catalog defaults', () => {
      expect(domain.listDailyCategories([])).toEqual([]);
    });

    it('ignores overrides of unknown categories', () => {
      expect(
        domain.listDailyCategories([{ category: 'comment.mentions_you', email: 'daily' }]),
      ).toEqual([]);
    });
  });

  describe('listEmailEnabledRows', () => {
    const rows = [
      makeNotificationRow('model', 'comment.on_your_model', '2026-01-01T08:00:00Z'),
      makeNotificationRow('reply', 'comment.reply_to_you', '2026-01-01T08:00:00Z'),
      makeNotificationRow('unknown', 'comment.mentions_you', '2026-01-01T08:00:00Z'),
    ];

    it('drops rows whose category email is now off and rows of unknown categories', () => {
      const kept = domain.listEmailEnabledRows(rows, [
        { category: 'comment.reply_to_you', email: 'off' },
      ]);

      expect(kept.map((row) => row.id)).toEqual(['model']);
    });

    it('keeps rows whose category is daily or immediate', () => {
      const kept = domain.listEmailEnabledRows(rows, [
        { category: 'comment.on_your_model', email: 'daily' },
        { category: 'comment.reply_to_you', email: 'immediate' },
      ]);

      expect(kept.map((row) => row.id)).toEqual(['model', 'reply']);
    });
  });
});

describe('mapProducersByCategory', () => {
  const onYourModel = mockNotificationProducer({
    name: 'on-your-model',
    categories: { 'comment.on_your_model': notificationCategoryCatalog['comment.on_your_model'] },
  });
  const replyToYou = mockNotificationProducer({
    name: 'reply-to-you',
    categories: { 'comment.reply_to_you': notificationCategoryCatalog['comment.reply_to_you'] },
  });
  const both = ['comment.on_your_model', 'comment.reply_to_you'] as const;

  // Catches a lookup that picks a producer without checking it declares the category.
  it('maps each category to the one producer that claims it', () => {
    const byCategory = mapProducersByCategory(both, [onYourModel, replyToYou]);

    expect(byCategory.get('comment.on_your_model')).toBe(onYourModel);
    expect(byCategory.get('comment.reply_to_you')).toBe(replyToYou);
  });

  // Catches a category added to the catalog without a producer.
  it('throws when a category is claimed by no producer', () => {
    expect(() => mapProducersByCategory(both, [onYourModel])).toThrow(
      NotificationCategoryClaimError,
    );
  });

  // Catches two producers both claiming one category, where delivery would pick one silently.
  it('throws when a category is claimed by two producers', () => {
    const alsoReplyToYou = { ...replyToYou, name: 'also-reply-to-you' };

    expect(() => mapProducersByCategory(both, [onYourModel, replyToYou, alsoReplyToYou])).toThrow(
      /comment.reply_to_you is claimed by 2 producers: reply-to-you, also-reply-to-you/,
    );
  });

  // Catches a domain that builds without checking its producers, so startup would not fail.
  it('makes the domain fail to build when its producers leave a category unclaimed', () => {
    expect(() => userNotificationDomain({ notificationProducers: [] })).toThrow(
      NotificationCategoryClaimError,
    );
  });
});
