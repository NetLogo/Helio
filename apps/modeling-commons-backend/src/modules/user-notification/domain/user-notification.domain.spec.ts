import { describe, it, expect } from 'vitest';
import userNotificationDomain from '#src/modules/user-notification/domain/user-notification.domain.ts';
import {
  NotificationAlreadyDeliveredError,
  NotificationNotFoundError,
  NotificationSuppressedError,
  RecipientBannedError,
  RecipientDeletedError,
  RecipientEmailDisabledError,
  RecipientEmailNotFoundError,
  RecipientNotFoundError,
} from '#src/modules/user-notification/domain/user-notification.errors.ts';
import type { UserEntity } from '#src/modules/user/domain/user.types.ts';

const domain = userNotificationDomain();

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

  describe('assertRecipientEligible', () => {
    it('returns the recipient with a narrowed, non-null email when eligible', () => {
      const user = makeUser({ id: 'recipient-1', email: 'recipient@example.com' });
      expect(domain.assertRecipientEligible(user, 'recipient-1')).toEqual(user);
    });

    it('throws RecipientNotFoundError when the recipient does not exist', () => {
      expect(() => domain.assertRecipientEligible(undefined, 'missing-1')).toThrow(
        RecipientNotFoundError,
      );
    });

    it('throws RecipientDeletedError for a soft-deleted recipient', () => {
      const user = makeUser({ deletedAt: new Date('2026-01-01') });
      expect(() => domain.assertRecipientEligible(user, user.id)).toThrow(RecipientDeletedError);
    });

    it('throws RecipientBannedError for a banned recipient', () => {
      const user = makeUser({ banned: true });
      expect(() => domain.assertRecipientEligible(user, user.id)).toThrow(RecipientBannedError);
    });

    it('throws RecipientEmailNotFoundError when the recipient has no email', () => {
      const user = makeUser({ email: null });
      expect(() => domain.assertRecipientEligible(user, user.id)).toThrow(
        RecipientEmailNotFoundError,
      );
    });
  });

  describe('assertChannelsEnabled', () => {
    it('throws NotificationSuppressedError when both channels are off', () => {
      expect(() =>
        domain.assertChannelsEnabled(
          { email: false, inApp: false },
          'recipient-1',
          'comment.on_your_model',
        ),
      ).toThrow(NotificationSuppressedError);
    });

    it('does not throw when at least one channel is on', () => {
      expect(() =>
        domain.assertChannelsEnabled(
          { email: true, inApp: false },
          'recipient-1',
          'comment.on_your_model',
        ),
      ).not.toThrow();
      expect(() =>
        domain.assertChannelsEnabled(
          { email: false, inApp: true },
          'recipient-1',
          'comment.on_your_model',
        ),
      ).not.toThrow();
    });
  });

  describe('assertEmailDeliverable', () => {
    it('returns the notification id when email is enabled and the ledger row was newly inserted', () => {
      expect(
        domain.assertEmailDeliverable(
          'notification-1',
          { email: true, inApp: true },
          'event-1',
          'recipient-1',
          'comment.on_your_model',
        ),
      ).toBe('notification-1');
    });

    it('throws NotificationAlreadyDeliveredError when the ledger row already existed', () => {
      expect(() =>
        domain.assertEmailDeliverable(
          undefined,
          { email: true, inApp: true },
          'event-1',
          'recipient-1',
          'comment.on_your_model',
        ),
      ).toThrow(NotificationAlreadyDeliveredError);
    });

    it('throws RecipientEmailDisabledError when the email channel is off', () => {
      expect(() =>
        domain.assertEmailDeliverable(
          'notification-1',
          { email: false, inApp: true },
          'event-1',
          'recipient-1',
          'comment.on_your_model',
        ),
      ).toThrow(RecipientEmailDisabledError);
    });
  });

  describe('isSkippableDeliveryError', () => {
    it.each([
      new RecipientNotFoundError('recipient-1'),
      new RecipientDeletedError('recipient-1'),
      new RecipientBannedError('recipient-1'),
      new RecipientEmailNotFoundError('recipient-1'),
      new NotificationSuppressedError('recipient-1', 'comment.on_your_model'),
      new RecipientEmailDisabledError('recipient-1', 'comment.on_your_model'),
      new NotificationAlreadyDeliveredError('event-1', 'recipient-1'),
    ])('treats %s as a skippable delivery error', (error) => {
      expect(domain.isSkippableDeliveryError(error)).toBe(true);
    });

    it('does not treat an unrelated error as skippable', () => {
      expect(domain.isSkippableDeliveryError(new Error('SMTP unreachable'))).toBe(false);
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
      expect(() =>
        domain.assertOwnedByRecipient(undefined, 'notification-1', 'user-1'),
      ).toThrow(NotificationNotFoundError);
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
