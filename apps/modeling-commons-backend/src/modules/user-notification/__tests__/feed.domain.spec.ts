import { describe, it, expect } from 'vitest';
import { NotificationNotFoundError } from '#src/modules/user-notification/core/notification.errors.ts';
import { assertOwnedByRecipient, isRead } from '#src/modules/user-notification/feed/feed.domain.ts';

describe('assertOwnedByRecipient', () => {
  it('accepts a notification addressed to the caller', () => {
    expect(() =>
      assertOwnedByRecipient(
        { id: 'notification-1', recipientId: 'user-1' },
        'notification-1',
        'user-1',
      ),
    ).not.toThrow();
  });

  it('rejects a missing notification', () => {
    expect(() => assertOwnedByRecipient(undefined, 'notification-1', 'user-1')).toThrow(
      NotificationNotFoundError,
    );
  });

  it('rejects a notification addressed to someone else', () => {
    expect(() =>
      assertOwnedByRecipient(
        { id: 'notification-1', recipientId: 'other-user' },
        'notification-1',
        'user-1',
      ),
    ).toThrow(NotificationNotFoundError);
  });
});

describe('isRead', () => {
  it('is true once readAt is set', () => {
    expect(isRead({ readAt: new Date() })).toBe(true);
  });

  it('is false for an unread notification', () => {
    expect(isRead({ readAt: null })).toBe(false);
  });

  it('is false for a missing notification', () => {
    expect(isRead(undefined)).toBe(false);
  });
});
