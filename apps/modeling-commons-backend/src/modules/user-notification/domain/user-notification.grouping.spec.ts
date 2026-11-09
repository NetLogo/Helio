import { describe, it, expect } from 'vitest';
import notificationsConfig from '#src/config/notifications.ts';
import { mockNotificationProducer } from '#src/modules/user-notification/domain/notification-producer.mock.ts';
import {
  buildDigest,
  groupNotifications,
} from '#src/modules/user-notification/domain/user-notification.grouping.ts';
import type {
  NotificationRow,
  NotificationGroup,
  NotificationPreviews,
  NotificationProducer,
} from '#src/modules/user-notification/domain/user-notification.types.ts';

describe('userNotificationGrouping', () => {
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

  function makeModelRow(
    id: string,
    modelId: string,
    actorUserId: string,
    minute: number,
    category = 'comment.on_your_model',
  ): NotificationRow {
    return makeNotificationRow(
      id,
      category,
      `2026-01-01T08:${String(minute).padStart(2, '0')}:00Z`,
      {
        actorUserId,
        targetType: 'model',
        targetId: modelId,
      },
    );
  }

  function describeByIds(name: string) {
    return (group: NotificationGroup) =>
      group.target?.id === 'hidden'
        ? undefined
        : {
            text: `${name} ${group.target?.id ?? 'none'} ${group.rows.map((row) => row.id).join(',')}`,
            url: `https://example.test/${name}`,
          };
  }

  const comments = mockNotificationProducer({
    name: 'model-comment',
    describeGroup: describeByIds('model-comment'),
  });
  const likes = mockNotificationProducer({
    name: 'model-like',
    describeGroup: describeByIds('model-like'),
  });
  const producerByCategory = new Map<string, NotificationProducer>([
    ['comment.on_your_model', comments],
    ['comment.reply_to_you', comments],
    ['like.on_your_model', likes],
  ]);

  function groupRows(rows: ReadonlyArray<NotificationRow>) {
    return groupNotifications(rows, producerByCategory).map(({ group }) => group);
  }

  const noPreviews = new Map<string, NotificationPreviews>();

  describe('groupNotifications', () => {
    it('returns no groups for no rows', () => {
      expect(groupNotifications([], producerByCategory)).toEqual([]);
    });

    it('merges comments and replies on one model into one group, across categories, newest row first', () => {
      const rows = [
        makeModelRow('c1', 'wolf', 'alice', 1),
        makeModelRow('c2', 'wolf', 'bob', 2),
        makeModelRow('r1', 'wolf', 'carol', 3, 'comment.reply_to_you'),
      ];

      const groups = groupRows(rows);

      expect(groups).toHaveLength(1);
      expect(groups[0]!.target).toEqual({ type: 'model', id: 'wolf' });
      expect(groups[0]!.rows.map((row) => row.id)).toEqual(['r1', 'c2', 'c1']);
      expect(groups[0]!.actors.map((actor) => actor.userId)).toEqual(['carol', 'bob', 'alice']);
    });

    it('keeps the rows of two producers on one model in two groups, each with its producer', () => {
      const rows = [
        makeModelRow('c1', 'wolf', 'alice', 1),
        makeModelRow('l1', 'wolf', 'bob', 2, 'like.on_your_model'),
        makeModelRow('c2', 'wolf', 'carol', 3),
      ];

      const groups = groupNotifications(rows, producerByCategory);

      expect(
        groups.map(({ producer, group }) => [producer.name, group.rows.map((row) => row.id)]),
      ).toEqual([
        ['model-comment', ['c2', 'c1']],
        ['model-like', ['l1']],
      ]);
    });

    it('leaves out a row whose category no producer claims', () => {
      const groups = groupRows([
        makeModelRow('c1', 'wolf', 'alice', 1),
        makeModelRow('x1', 'wolf', 'bob', 2, 'comment.mentions_you'),
      ]);

      expect(groups.map((group) => group.rows.map((row) => row.id))).toEqual([['c1']]);
    });

    it('lists an actor once, at their newest row', () => {
      const groups = groupRows([
        makeModelRow('a-old', 'wolf', 'alice', 1),
        makeModelRow('b', 'wolf', 'bob', 2),
        makeModelRow('a-new', 'wolf', 'alice', 3),
      ]);

      expect(groups[0]!.actors).toEqual([
        { userId: 'alice', rowId: 'a-new' },
        { userId: 'bob', rowId: 'b' },
      ]);
    });

    it('orders groups by their newest row, newest first', () => {
      const groups = groupRows([
        makeModelRow('w1', 'wolf', 'alice', 1),
        makeModelRow('v1', 'virus', 'alice', 2),
        makeModelRow('w2', 'wolf', 'bob', 3),
      ]);

      expect(groups.map((group) => group.target?.id)).toEqual(['wolf', 'virus']);
    });

    it('keeps every row without a target in a group of its own', () => {
      const groups = groupRows([
        makeNotificationRow('a', 'comment.on_your_model', '2026-01-01T08:00:00Z'),
        makeNotificationRow('b', 'comment.on_your_model', '2026-01-01T09:00:00Z'),
      ]);

      expect(groups.map((group) => [group.target, group.rows.map((row) => row.id)])).toEqual([
        [null, ['b']],
        [null, ['a']],
      ]);
    });
  });

  describe('buildDigest', () => {
    it('returns no items for no rows', () => {
      expect(buildDigest([], noPreviews, producerByCategory)).toEqual({ items: [], moreCount: 0 });
    });

    it('asks the producer of each group for its line, newest first, and leaves out a group without one', () => {
      const rows = [
        makeModelRow('c1', 'wolf', 'alice', 1),
        makeModelRow('h1', 'hidden', 'alice', 2),
        makeModelRow('l1', 'wolf', 'bob', 3, 'like.on_your_model'),
      ];

      expect(buildDigest(rows, noPreviews, producerByCategory)).toEqual({
        items: [
          { text: 'model-like wolf l1', url: 'https://example.test/model-like' },
          { text: 'model-comment wolf c1', url: 'https://example.test/model-comment' },
        ],
        moreCount: 0,
      });
    });

    it('passes the previews to the producer', () => {
      const previews = new Map<string, NotificationPreviews>([
        ['c1', { actor: null, target: { name: 'Wolf', thumbnailUrl: null, url: 'u' } }],
      ]);
      const seen: Array<ReadonlyMap<string, NotificationPreviews>> = [];
      const recording = mockNotificationProducer({
        describeGroup: (_group, received) => {
          seen.push(received);
          return undefined;
        },
      });

      buildDigest(
        [makeModelRow('c1', 'wolf', 'alice', 1)],
        previews,
        new Map([['comment.on_your_model', recording]]),
      );

      expect(seen).toEqual([previews]);
    });

    it('caps the lines at maxDigestItems and counts the rest', () => {
      const cap = notificationsConfig.maxDigestItems;
      const rows = Array.from({ length: cap + 3 }, (_, index) =>
        makeModelRow(`row-${index}`, `model-${index}`, 'alice', index),
      );

      const digest = buildDigest(rows, noPreviews, producerByCategory);

      expect(digest.items).toHaveLength(cap);
      expect(digest.items[0]!.text).toBe(`model-comment model-${cap + 2} row-${cap + 2}`);
      expect(digest.moreCount).toBe(3);
    });

    it('does not count a line it left out as more', () => {
      const cap = notificationsConfig.maxDigestItems;
      const rows = [
        ...Array.from({ length: cap }, (_, index) =>
          makeModelRow(`row-${index}`, `model-${index}`, 'alice', index + 1),
        ),
        makeModelRow('h1', 'hidden', 'alice', 0),
      ];

      expect(buildDigest(rows, noPreviews, producerByCategory).moreCount).toBe(0);
    });
  });
});
