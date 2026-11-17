import type {
  NotificationCategory,
  RegisteredNotificationModule,
} from '#src/modules/notification-catalog.ts';
import { describe, it, expect } from 'vitest';
import { makeSubjectsByNotificationId } from '#src/modules/user-notification/core/subjects.domain.ts';
import notificationsConfig from '#src/config/notifications.ts';
import { mockRegisteredNotificationModule } from '#src/modules/user-notification/__tests__/producer.mock.ts';
import {
  buildDigest,
  getDigestWindow,
  getPendingWindow,
  groupNotifications,
} from '#src/modules/user-notification/digest/digest.domain.ts';
import type {
  Digest,
  Notification,
  SubjectsByNotificationId,
} from '#src/modules/user-notification/core/types/index.ts';

describe('digest domain', () => {
  function makeNotification(
    id: string,
    category: NotificationCategory,
    createdAt: string,
    overrides: Partial<Notification> = {},
  ): Notification {
    return {
      id,
      category,
      url: `https://example.test/${id}`,
      payload: { commentId: 'comment-1', excerpt: '' },
      actorId: null,
      targetType: null,
      targetId: null,
      createdAt: new Date(createdAt),
      ...overrides,
    };
  }

  function makeModelNotification(
    id: string,
    modelId: string,
    actorId: string,
    minute: number,
    category: NotificationCategory = 'comment.on_your_model',
  ): Notification {
    return makeNotification(id, category, `2026-01-01T08:${String(minute).padStart(2, '0')}:00Z`, {
      actorId,
      targetType: 'model',
      targetId: modelId,
    });
  }

  function describeByIds(name: string) {
    return (group: Digest.Group) =>
      group.target?.id === 'hidden'
        ? undefined
        : {
            text: `${name} ${group.target?.id ?? 'none'} ${group.notifications.map((notification) => notification.id).join(',')}`,
            url: `https://example.test/${name}`,
          };
  }

  const comments = mockRegisteredNotificationModule(
    { describeDigestItem: describeByIds('model-comment') },
    { name: 'model-comment' },
  );
  const likes = mockRegisteredNotificationModule(
    { describeDigestItem: describeByIds('model-like') },
    { name: 'model-like' },
  );
  const moduleByCategory = {
    'comment.on_your_model': comments,
    'comment.reply_to_you': comments,
    'like.on_your_model': likes,
  } as Record<NotificationCategory, RegisteredNotificationModule>;

  function groupNotificationsOf(notifications: ReadonlyArray<Notification>) {
    return groupNotifications(notifications, moduleByCategory).map(({ group }) => group);
  }

  const noSubjects = makeSubjectsByNotificationId([]);

  describe('getDigestWindow', () => {
    it('spans from windowMs before now to minAgeMs before now', () => {
      const now = new Date('2026-01-02T17:00:00Z');

      expect(getDigestWindow(now)).toEqual({
        since: new Date(now.getTime() - notificationsConfig.windowMs),
        until: new Date(now.getTime() - notificationsConfig.minAgeMs),
      });
    });

    it('covers 48 hours up to 5 minutes ago', () => {
      const { since, until } = getDigestWindow(new Date('2026-01-03T17:00:00Z'));

      expect(since).toEqual(new Date('2026-01-01T17:00:00Z'));
      expect(until).toEqual(new Date('2026-01-03T16:55:00Z'));
    });

    it('still covers the day before a missed daily run', () => {
      const { since } = getDigestWindow(new Date('2026-01-03T17:00:00Z'));

      expect(since.getTime()).toBeLessThanOrEqual(new Date('2026-01-01T17:00:00Z').getTime());
    });
  });

  describe('getPendingWindow', () => {
    it('covers the last 48 hours up to now, with no minimum age', () => {
      const now = new Date('2026-01-03T17:00:00Z');

      expect(getPendingWindow(now)).toEqual({
        since: new Date('2026-01-01T17:00:00Z'),
        until: now,
      });
    });
  });

  describe('groupNotifications', () => {
    it('returns no groups for no notifications', () => {
      expect(groupNotifications([], moduleByCategory)).toEqual([]);
    });

    it('merges comments and replies on one model into one group, across categories, newest notification first', () => {
      const notifications = [
        makeModelNotification('c1', 'wolf', 'alice', 1),
        makeModelNotification('c2', 'wolf', 'bob', 2),
        makeModelNotification('r1', 'wolf', 'carol', 3, 'comment.reply_to_you'),
      ];

      const groups = groupNotificationsOf(notifications);

      expect(groups).toHaveLength(1);
      expect(groups[0]!.target).toEqual({ type: 'model', id: 'wolf' });
      expect(groups[0]!.notifications.map((notification) => notification.id)).toEqual([
        'r1',
        'c2',
        'c1',
      ]);
      expect(groups[0]!.actors.map((actor) => actor.userId)).toEqual(['carol', 'bob', 'alice']);
    });

    it('keeps the notifications of two producers on one model in two groups, each with its producer', () => {
      const notifications = [
        makeModelNotification('c1', 'wolf', 'alice', 1),
        makeModelNotification('l1', 'wolf', 'bob', 2, 'like.on_your_model' as NotificationCategory),
        makeModelNotification('c2', 'wolf', 'carol', 3),
      ];

      const groups = groupNotifications(notifications, moduleByCategory);

      expect(
        groups.map(({ module, group }) => [
          module.name,
          group.notifications.map((notification) => notification.id),
        ]),
      ).toEqual([
        ['model-comment', ['c2', 'c1']],
        ['model-like', ['l1']],
      ]);
    });

    it('lists an actor once, at their newest notification', () => {
      const groups = groupNotificationsOf([
        makeModelNotification('a-old', 'wolf', 'alice', 1),
        makeModelNotification('b', 'wolf', 'bob', 2),
        makeModelNotification('a-new', 'wolf', 'alice', 3),
      ]);

      expect(groups[0]!.actors).toEqual([
        { userId: 'alice', notificationId: 'a-new' },
        { userId: 'bob', notificationId: 'b' },
      ]);
    });

    it('orders groups by their newest notification, newest first', () => {
      const groups = groupNotificationsOf([
        makeModelNotification('w1', 'wolf', 'alice', 1),
        makeModelNotification('v1', 'virus', 'alice', 2),
        makeModelNotification('w2', 'wolf', 'bob', 3),
      ]);

      expect(groups.map((group) => group.target?.id)).toEqual(['wolf', 'virus']);
    });

    it('keeps every notification without a target in a group of its own', () => {
      const groups = groupNotificationsOf([
        makeNotification('a', 'comment.on_your_model', '2026-01-01T08:00:00Z'),
        makeNotification('b', 'comment.on_your_model', '2026-01-01T09:00:00Z'),
      ]);

      expect(
        groups.map((group) => [
          group.target,
          group.notifications.map((notification) => notification.id),
        ]),
      ).toEqual([
        [null, ['b']],
        [null, ['a']],
      ]);
    });
  });

  describe('buildDigest', () => {
    it('returns no items for no notifications', () => {
      expect(buildDigest([], noSubjects, moduleByCategory)).toEqual({ items: [], moreCount: 0 });
    });

    it('asks the producer of each group for its line, newest first, and leaves out a group without one', () => {
      const notifications = [
        makeModelNotification('c1', 'wolf', 'alice', 1),
        makeModelNotification('h1', 'hidden', 'alice', 2),
        makeModelNotification('l1', 'wolf', 'bob', 3, 'like.on_your_model' as NotificationCategory),
      ];

      expect(buildDigest(notifications, noSubjects, moduleByCategory)).toEqual({
        items: [
          { text: 'model-like wolf l1', url: 'https://example.test/model-like' },
          { text: 'model-comment wolf c1', url: 'https://example.test/model-comment' },
        ],
        moreCount: 0,
      });
    });

    it('passes the subjects to the producer', () => {
      const subjects = makeSubjectsByNotificationId([
        ['c1', { actor: null, target: { name: 'Wolf', thumbnailUrl: null, url: 'u' } }],
      ]);
      const seen: Array<SubjectsByNotificationId> = [];
      const recording = mockRegisteredNotificationModule({
        describeDigestItem: (_group, received) => {
          seen.push(received);
          return undefined;
        },
      });

      buildDigest([makeModelNotification('c1', 'wolf', 'alice', 1)], subjects, {
        ...moduleByCategory,
        'comment.on_your_model': recording,
      });

      expect(seen).toEqual([subjects]);
    });

    it('caps the lines at maxDigestItems and counts the rest', () => {
      const cap = notificationsConfig.maxDigestItems;
      const notifications = Array.from({ length: cap + 3 }, (_, index) =>
        makeModelNotification(`notification-${index}`, `model-${index}`, 'alice', index),
      );

      const digest = buildDigest(notifications, noSubjects, moduleByCategory);

      expect(digest.items).toHaveLength(cap);
      expect(digest.items[0]!.text).toBe(`model-comment model-${cap + 2} notification-${cap + 2}`);
      expect(digest.moreCount).toBe(3);
    });

    it('does not count a line it left out as more', () => {
      const cap = notificationsConfig.maxDigestItems;
      const notifications = [
        ...Array.from({ length: cap }, (_, index) =>
          makeModelNotification(`notification-${index}`, `model-${index}`, 'alice', index + 1),
        ),
        makeModelNotification('h1', 'hidden', 'alice', 0),
      ];

      expect(buildDigest(notifications, noSubjects, moduleByCategory).moreCount).toBe(0);
    });
  });
});
