import { describe, it, expect, beforeEach, vi } from 'vitest';
import makeListUserNotificationsQuery from '#src/modules/user-notification/queries/list-user-notifications.query.ts';
import userNotificationDomain from '#src/modules/user-notification/domain/user-notification.domain.ts';
import userNotificationMapper from '#src/modules/user-notification/user-notification.mapper.ts';
import { mockNotificationPreferenceRepository } from '#src/modules/user-notification/database/notification-preference.repository.mock.ts';
import { mockUserNotificationRepository } from '#src/modules/user-notification/database/user-notification.repository.mock.ts';
import type { NotificationPreferenceRecord } from '#src/modules/user-notification/database/notification-preference.record.ts';
import type { UserNotificationRecord } from '#src/modules/user-notification/database/user-notification.record.ts';

function makePreference(
  overrides: Partial<NotificationPreferenceRecord> = {},
): NotificationPreferenceRecord {
  return {
    id: 'pref-1',
    userId: 'user-1',
    category: 'comment.on_your_model',
    email: true,
    inApp: true,
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeNotification(overrides: Partial<UserNotificationRecord> = {}): UserNotificationRecord {
  return {
    id: 'notification-1',
    recipientId: 'user-1',
    eventId: 'event-1',
    category: 'comment.on_your_model',
    title: 'New comment',
    body: 'Someone commented on your model',
    url: 'https://example.test/models/model-1',
    emailSentAt: null,
    readAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as UserNotificationRecord;
}

describe('listUserNotificationsQuery', () => {
  const notificationPreferenceRepository = mockNotificationPreferenceRepository();
  const userNotificationRepository = mockUserNotificationRepository();
  const domain = userNotificationDomain();

  const query = makeListUserNotificationsQuery({
    userNotificationRepository,
    notificationPreferenceRepository,
    userNotificationDomain: domain,
    userNotificationMapper: userNotificationMapper(),
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
    notificationPreferenceRepository.findAllByUser.mockResolvedValue([]);
    userNotificationRepository.findAllByRecipient.mockResolvedValue({
      count: 1,
      limit: 20,
      page: 0,
      data: [makeNotification()],
    });
    userNotificationRepository.countUnread.mockResolvedValue(3);
  });

  it('serialises a record into the response shape', async () => {
    const result = await query.execute('user-1', {});

    expect(result).toEqual({
      count: 1,
      limit: 20,
      page: 0,
      unreadCount: 3,
      data: [
        {
          id: 'notification-1',
          category: 'comment.on_your_model',
          title: 'New comment',
          body: 'Someone commented on your model',
          url: 'https://example.test/models/model-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          readAt: null,
        },
      ],
    });
  });

  it('restricts the feed to the categories whose inApp channel is on', async () => {
    const result = await query.execute('user-1', {});

    const [, filters] = userNotificationRepository.findAllByRecipient.mock.calls[0]!;
    expect(filters.categories).toEqual(
      domain.categories.filter((info) => info.defaults.inApp).map((info) => info.category),
    );
    expect(result.count).toBe(1);
  });

  it('honours an inApp override over the catalog default', async () => {
    notificationPreferenceRepository.findAllByUser.mockResolvedValue([
      makePreference({ category: 'comment.on_your_model', inApp: false }),
      makePreference({ id: 'pref-2', category: 'general.daily_digest', inApp: true }),
    ]);

    await query.execute('user-1', {});

    const [, filters] = userNotificationRepository.findAllByRecipient.mock.calls[0]!;
    expect(filters.categories).not.toContain('comment.on_your_model');
    expect(filters.categories).toContain('general.daily_digest');
  });

  it('returns an empty page without touching the ledger when every category is muted', async () => {
    notificationPreferenceRepository.findAllByUser.mockResolvedValue(
      domain.categories.map((info, index) =>
        makePreference({ id: `pref-${index}`, category: info.category, inApp: false }),
      ),
    );

    const result = await query.execute('user-1', { limit: 10, page: 2 });

    expect(result).toEqual({ count: 0, limit: 10, page: 2, data: [], unreadCount: 0 });
    expect(userNotificationRepository.findAllByRecipient).not.toHaveBeenCalled();
    expect(userNotificationRepository.countUnread).not.toHaveBeenCalled();
  });

  it('passes since through as a Date and forwards unreadOnly', async () => {
    await query.execute('user-1', { since: '2026-07-01T00:00:00.000Z', unreadOnly: true });

    const [recipientId, filters, params] =
      userNotificationRepository.findAllByRecipient.mock.calls[0]!;
    expect(recipientId).toBe('user-1');
    expect(filters.since).toEqual(new Date('2026-07-01T00:00:00.000Z'));
    expect(filters.unreadOnly).toBe(true);
    expect(params).toMatchObject({ limit: 20, page: 0, offset: 0 });
  });

  it('counts unread across every in-app category, not just the requested page', async () => {
    await query.execute('user-1', { since: '2026-07-01T00:00:00.000Z', unreadOnly: true, page: 3 });

    const [recipientId, categories] = userNotificationRepository.countUnread.mock.calls[0]!;
    expect(recipientId).toBe('user-1');
    expect(categories).toEqual(
      domain.categories.filter((info) => info.defaults.inApp).map((info) => info.category),
    );
  });
});
