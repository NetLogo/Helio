import { describe, it, expect } from 'vitest';
import notificationsConfig from '#src/config/notifications.ts';
import {
  buildDigest,
  describeGroup,
  groupNotifications,
} from '#src/modules/user-notification/domain/user-notification.grouping.ts';
import type {
  DigestRow,
  ResolvedNotificationSubjects,
} from '#src/modules/user-notification/domain/user-notification.types.ts';

describe('userNotificationGrouping', () => {
  function makeDigestRow(
    id: string,
    category: string,
    createdAt: string,
    overrides: Partial<DigestRow> = {},
  ): DigestRow {
    return {
      id,
      category,
      title: `title ${id}`,
      url: `https://example.test/${id}`,
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
  ): DigestRow {
    return makeDigestRow(
      id,
      'comment.on_your_model',
      `2026-01-01T08:${String(minute).padStart(2, '0')}:00Z`,
      {
        actorUserId,
        targetType: 'model',
        targetId: modelId,
      },
    );
  }

  const userNames: Record<string, string | null> = {
    alice: 'Alice',
    bob: 'Bob',
    carol: 'Carol',
    dave: 'Dave',
    nameless: null,
  };
  const modelNames: Record<string, string | null> = {
    wolf: 'Wolf Sheep',
    virus: 'Virus',
    hidden: null,
  };

  function resolveSubjects(
    rows: ReadonlyArray<DigestRow>,
  ): Map<string, ResolvedNotificationSubjects> {
    return new Map(
      rows.map((row) => {
        const actorName = row.actorUserId ? userNames[row.actorUserId] : undefined;
        const modelName = row.targetId ? modelNames[row.targetId] : undefined;
        return [
          row.id,
          {
            actor:
              actorName === undefined
                ? null
                : {
                    name: actorName,
                    thumbnailUrl: null,
                    url: `https://example.test/users/${row.actorUserId}`,
                  },
            target:
              modelName === undefined
                ? null
                : {
                    name: modelName,
                    thumbnailUrl: null,
                    url: `https://example.test/models/${row.targetId}`,
                  },
          },
        ];
      }),
    );
  }

  function describeRows(rows: ReadonlyArray<DigestRow>) {
    const subjects = resolveSubjects(rows);
    return groupNotifications(rows).map((group) => describeGroup(group, subjects));
  }

  describe('groupNotifications', () => {
    it('returns no groups for no rows', () => {
      expect(groupNotifications([])).toEqual([]);
    });

    it('merges comments and replies on one model into one group, across categories', () => {
      const rows = [
        makeModelRow('c1', 'wolf', 'alice', 1),
        makeModelRow('c2', 'wolf', 'bob', 2),
        { ...makeModelRow('r1', 'wolf', 'carol', 3), category: 'comment.reply_to_you' },
      ];

      const groups = groupNotifications(rows);

      expect(groups).toHaveLength(1);
      expect(groups[0]!.target).toEqual({ type: 'model', id: 'wolf' });
      expect(groups[0]!.rowIds).toEqual(['r1', 'c2', 'c1']);
      expect(groups[0]!.actors.map((actor) => actor.userId)).toEqual(['carol', 'bob', 'alice']);
    });

    it('lists an actor once, at their newest row', () => {
      const groups = groupNotifications([
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
      const groups = groupNotifications([
        makeModelRow('w1', 'wolf', 'alice', 1),
        makeModelRow('v1', 'virus', 'alice', 2),
        makeModelRow('w2', 'wolf', 'bob', 3),
      ]);

      expect(groups.map((group) => group.target?.id)).toEqual(['wolf', 'virus']);
    });

    it('keeps every row without a target in a group of its own', () => {
      const groups = groupNotifications([
        makeDigestRow('a', 'comment.on_your_model', '2026-01-01T08:00:00Z'),
        makeDigestRow('b', 'comment.on_your_model', '2026-01-01T09:00:00Z'),
      ]);

      expect(groups.map((group) => [group.target, group.rowIds])).toEqual([
        [null, ['b']],
        [null, ['a']],
      ]);
    });
  });

  describe('describeGroup', () => {
    it('names at most two of three people commenting and replying on one model', () => {
      const rows = [
        makeModelRow('c1', 'wolf', 'alice', 1),
        makeModelRow('c2', 'wolf', 'bob', 2),
        { ...makeModelRow('r1', 'wolf', 'carol', 3), category: 'comment.reply_to_you' },
      ];

      expect(describeRows(rows)).toEqual([
        {
          text: 'Carol, Bob, and 1 other commented on Wolf Sheep',
          url: 'https://example.test/models/wolf',
        },
      ]);
    });

    it('counts one person commenting several times once', () => {
      const rows = [
        makeModelRow('a1', 'wolf', 'alice', 1),
        makeModelRow('a2', 'wolf', 'alice', 2),
        makeModelRow('a3', 'wolf', 'alice', 3),
      ];

      expect(describeRows(rows).map((item) => item?.text)).toEqual([
        'Alice commented on Wolf Sheep',
      ]);
    });

    it('counts an actor who no longer resolves without naming them', () => {
      const rows = [
        makeModelRow('gone', 'wolf', 'deleted-user', 2),
        makeModelRow('a', 'wolf', 'alice', 1),
      ];

      expect(describeRows(rows).map((item) => item?.text)).toEqual([
        'Alice and 1 other commented on Wolf Sheep',
      ]);
    });

    it('counts an actor without a name without naming them', () => {
      expect(
        describeRows([makeModelRow('n', 'wolf', 'nameless', 1)]).map((item) => item?.text),
      ).toEqual(['One person commented on Wolf Sheep']);
    });

    it('returns nothing for a group whose model no longer resolves', () => {
      expect(describeRows([makeModelRow('a', 'deleted-model', 'alice', 1)])).toEqual([undefined]);
    });

    it('falls back to the stored title, linking the model, when the model has no visible name', () => {
      const row = makeModelRow('a', 'hidden', 'alice', 1);

      expect(describeRows([row])).toEqual([
        { text: row.title, url: 'https://example.test/models/hidden' },
      ]);
    });

    it('uses the stored title and url of a row without a target', () => {
      const row = makeDigestRow('a', 'comment.on_your_model', '2026-01-01T08:00:00Z');

      expect(describeRows([row])).toEqual([{ text: row.title, url: row.url }]);
    });
  });

  describe('buildDigest', () => {
    it('returns no items for no rows', () => {
      expect(buildDigest([], new Map())).toEqual({ items: [], moreCount: 0 });
    });

    it('builds one line per model, newest first, and leaves out a model that no longer resolves', () => {
      const rows = [
        makeModelRow('w1', 'wolf', 'alice', 1),
        makeModelRow('gone', 'deleted-model', 'alice', 2),
        makeModelRow('v1', 'virus', 'bob', 3),
        makeModelRow('w2', 'wolf', 'bob', 4),
      ];

      expect(buildDigest(rows, resolveSubjects(rows))).toEqual({
        items: [
          {
            text: 'Bob and Alice commented on Wolf Sheep',
            url: 'https://example.test/models/wolf',
          },
          { text: 'Bob commented on Virus', url: 'https://example.test/models/virus' },
        ],
        moreCount: 0,
      });
    });

    it('caps the lines at maxDigestItems and counts the rest', () => {
      const cap = notificationsConfig.maxDigestItems;
      const rows = Array.from({ length: cap + 3 }, (_, index) =>
        makeDigestRow(
          `row-${index}`,
          'comment.on_your_model',
          new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
        ),
      );

      const digest = buildDigest(rows, resolveSubjects(rows));

      expect(digest.items).toHaveLength(cap);
      expect(digest.items[0]!.text).toBe(`title row-${cap + 2}`);
      expect(digest.moreCount).toBe(3);
    });

    it('does not count a line it left out as more', () => {
      const cap = notificationsConfig.maxDigestItems;
      const rows = [
        ...Array.from({ length: cap }, (_, index) =>
          makeDigestRow(
            `row-${index}`,
            'comment.on_your_model',
            new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
          ),
        ),
        makeModelRow('gone', 'deleted-model', 'alice', 1),
      ];

      expect(buildDigest(rows, resolveSubjects(rows)).moreCount).toBe(0);
    });
  });
});
