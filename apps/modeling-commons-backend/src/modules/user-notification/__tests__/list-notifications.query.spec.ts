import { makeSubjectsByNotificationId } from '#src/modules/user-notification/core/subjects.domain.ts';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  notificationCategories,
  notificationCategoryCatalog,
} from '#src/modules/notification-catalog.ts';
import makeListNotificationsQuery from '#src/modules/user-notification/feed/list-notifications.query.ts';
import producerLookupDomain from '#src/modules/user-notification/core/producer-lookup.domain.ts';
import { mockRegisteredNotificationModule } from '#src/modules/user-notification/__tests__/producer.mock.ts';
import userNotificationMapper from '#src/modules/user-notification/user-notification.mapper.ts';
import { mockNotificationPreferenceRepository } from '#src/modules/user-notification/preferences/database/notification-preference.repository.mock.ts';
import { mockUserNotificationRepository } from '#src/modules/user-notification/core/database/user-notification.repository.mock.ts';
import type { NotificationPreferenceRecord } from '#src/modules/user-notification/preferences/database/notification-preference.record.ts';
import type { UserNotificationRecord } from '#src/modules/user-notification/core/database/user-notification.record.ts';

function makePreference(
  overrides: Partial<NotificationPreferenceRecord> = {},
): NotificationPreferenceRecord {
  return {
    id: 'pref-1',
    userId: 'user-1',
    category: 'comment.on_your_model',
    email: 'immediate',
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
    url: 'https://example.test/models/model-1',
    payload: { note: 'Nice model' },
    actorId: 'commenter-1',
    targetType: 'model',
    targetId: 'model-1',
    emailSentAt: null,
    readAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as UserNotificationRecord;
}

const catalogCategories = notificationCategories.map((category) => ({
  category,
  ...notificationCategoryCatalog[category],
}));

describe('listNotificationsQuery', () => {
  const notificationPreferenceRepository = mockNotificationPreferenceRepository();
  const userNotificationRepository = mockUserNotificationRepository();
  const producerLookup = producerLookupDomain({
    registeredNotificationModules: [
      mockRegisteredNotificationModule({
        describeFeedItem: (notification, subject) => ({
          title: `${subject.actor?.name ?? 'nobody'} on ${notification.category}`,
          body: JSON.stringify(notification.payload),
        }),
      }),
    ],
  });

  const getNotificationSubjectsQuery = { execute: vi.fn() };

  const query = makeListNotificationsQuery({
    userNotificationRepository,
    notificationPreferenceRepository,
    producerLookupDomain: producerLookup,
    userNotificationMapper: userNotificationMapper(),
    getNotificationSubjectsQuery,
  } as never);

  const resolvedPreviews = {
    actor: {
      name: 'Alice',
      thumbnailUrl: 'https://cdn.example.test/avatars/commenter-1.png',
      url: 'https://example.test/users/commenter-1',
    },
    target: {
      name: 'Wolf Sheep',
      thumbnailUrl: 'https://cdn.example.test/subjects/model-1.png',
      url: 'https://example.test/models/model-1',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getNotificationSubjectsQuery.execute.mockResolvedValue(
      makeSubjectsByNotificationId([['notification-1', resolvedPreviews]]),
    );
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
          title: 'Alice on comment.on_your_model',
          body: '{"note":"Nice model"}',
          url: 'https://example.test/models/model-1',
          actor: {
            name: 'Alice',
            thumbnailUrl: 'https://cdn.example.test/avatars/commenter-1.png',
            url: 'https://example.test/users/commenter-1',
          },
          target: {
            name: 'Wolf Sheep',
            thumbnailUrl: 'https://cdn.example.test/subjects/model-1.png',
            url: 'https://example.test/models/model-1',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          readAt: null,
        },
      ],
    });
  });

  it('describes each notification through its producer with the notification and its live subject', async () => {
    getNotificationSubjectsQuery.execute.mockResolvedValue(
      makeSubjectsByNotificationId([
        [
          'notification-1',
          { ...resolvedPreviews, actor: { ...resolvedPreviews.actor, name: 'Renamed' } },
        ],
      ]),
    );

    const result = await query.execute('user-1', {});

    expect(result.data[0]).toMatchObject({ title: 'Renamed on comment.on_your_model' });
  });

  it('resolves subjects from the page it just read, not from the stored notification', async () => {
    await query.execute('user-1', {});

    const [records, viewerId] = getNotificationSubjectsQuery.execute.mock.calls[0]!;
    expect(records).toEqual([expect.objectContaining({ id: 'notification-1' })]);
    expect(viewerId).toBe('user-1');
    expect(getNotificationSubjectsQuery.execute).toHaveBeenCalledOnce();
  });

  it('serialises a notification whose references no longer resolve as nulls', async () => {
    getNotificationSubjectsQuery.execute.mockResolvedValue(
      makeSubjectsByNotificationId([['notification-1', { actor: null, target: null }]]),
    );

    const result = await query.execute('user-1', {});

    expect(result.data[0]).toMatchObject({ actor: null, target: null });
  });

  it('restricts the feed to the categories whose inApp channel is on', async () => {
    const result = await query.execute('user-1', {});

    const [, filters] = userNotificationRepository.findAllByRecipient.mock.calls[0]!;
    expect(filters.categories).toEqual(
      catalogCategories.filter((info) => info.defaults.inApp).map((info) => info.category),
    );
    expect(result.count).toBe(1);
  });

  it('honours an inApp override over the catalog default', async () => {
    notificationPreferenceRepository.findAllByUser.mockResolvedValue([
      makePreference({ category: 'comment.on_your_model', inApp: false }),
    ]);

    await query.execute('user-1', {});

    const [, filters] = userNotificationRepository.findAllByRecipient.mock.calls[0]!;
    expect(filters.categories).not.toContain('comment.on_your_model');
  });

  it('returns an empty page without touching the notification when every category is muted', async () => {
    notificationPreferenceRepository.findAllByUser.mockResolvedValue(
      catalogCategories.map((info, index) =>
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
      catalogCategories.filter((info) => info.defaults.inApp).map((info) => info.category),
    );
  });
});
