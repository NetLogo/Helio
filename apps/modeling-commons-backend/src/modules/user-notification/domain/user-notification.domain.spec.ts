import { describe, it, expect } from 'vitest';
import userNotificationDomain from '#src/modules/user-notification/domain/user-notification.domain.ts';
import { NotificationNotFoundError } from '#src/modules/user-notification/domain/user-notification.errors.ts';
import type { NotificationIntent } from '#src/modules/user-notification/domain/user-notification.types.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import type { UserEntity } from '#src/modules/user/domain/user.types.ts';

const domain = userNotificationDomain();

describe('userNotificationDomain', () => {
  describe('categories', () => {
    it('exposes exactly the three known categories', () => {
      const names = domain.categories.map((c) => c.category).sort();
      expect(names).toEqual(
        ['comment.on_your_model', 'comment.reply_to_you', 'general.daily_digest'].sort(),
      );
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

    it('applies an override for both channels', () => {
      const { category, defaults } = domain.categories[0]!;
      const opposite = { email: !defaults.email, inApp: !defaults.inApp };
      expect(domain.resolvePreference(category, opposite)).toEqual(opposite);
    });

    it('merges a partial override, keeping the default for the omitted channel', () => {
      const { category, defaults } = domain.categories[0]!;
      expect(domain.resolvePreference(category, { email: !defaults.email })).toEqual({
        email: !defaults.email,
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
  describe('inAppEnabledCategories', () => {
    it('falls back to the catalog defaults when the user has no overrides', () => {
      expect(domain.inAppEnabledCategories([])).toEqual(
        domain.categories.filter((info) => info.defaults.inApp).map((info) => info.category),
      );
    });

    it('drops a category the user muted in-app', () => {
      const result = domain.inAppEnabledCategories([
        { category: 'comment.on_your_model', inApp: false },
      ]);

      expect(result).not.toContain('comment.on_your_model');
    });

    it('adds a category the user opted into against a default of off', () => {
      const result = domain.inAppEnabledCategories([
        { category: 'general.daily_digest', inApp: true },
      ]);

      expect(result).toContain('general.daily_digest');
    });

    it('ignores an override that only touches the email channel', () => {
      const result = domain.inAppEnabledCategories([
        { category: 'comment.on_your_model', email: false },
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
    processedAt: null,
    attempts: 0,
    lastError: null,
  };
}

function makeIntent(overrides: Partial<NotificationIntent> = {}): NotificationIntent {
  return {
    recipientUserId: 'recipient-1',
    category: 'comment.on_your_model',
    title: 'New comment',
    body: 'Someone commented on your model',
    url: 'https://example.test/models/model-1',
    buildEmail: async () => ({}),
    ...overrides,
  };
}

describe('userNotificationDomain delivery helpers', () => {
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
      expect(domain.isSuppressed({ email: false, inApp: false })).toBe(true);
    });

    it.each([
      { email: true, inApp: false },
      { email: false, inApp: true },
      { email: true, inApp: true },
    ])('does not suppress when a channel is on: %o', (channels) => {
      expect(domain.isSuppressed(channels)).toBe(false);
    });
  });

  describe('createLedgerRow', () => {
    it('maps an intent with an actor and a target to their reference columns', () => {
      const row = domain.createLedgerRow(
        makeEvent(),
        'recipient-1',
        makeIntent({ actorUserId: 'actor-1', target: { type: 'model', id: 'model-1' } }),
      );

      expect(row).toEqual({
        recipientId: 'recipient-1',
        eventId: 'event-1',
        category: 'comment.on_your_model',
        title: 'New comment',
        body: 'Someone commented on your model',
        url: 'https://example.test/models/model-1',
        actorUserId: 'actor-1',
        targetType: 'model',
        targetId: 'model-1',
      });
    });

    it('writes null reference columns for an intent with neither actor nor target', () => {
      const row = domain.createLedgerRow(makeEvent(), 'recipient-1', makeIntent());

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
