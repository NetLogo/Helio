import { describe, expect, it, vi } from 'vitest';
import type { UserNotificationRecord } from '#src/modules/user-notification/core/database/user-notification.record.ts';
import userNotificationRepository, {
  buildInsertNotificationQuery,
} from '#src/modules/user-notification/core/database/user-notification.repository.ts';
import type { InsertUserNotificationParams } from '#src/modules/user-notification/core/database/user-notification.repository.port.ts';
import makePrismaTransactionManager from '#src/shared/db/prisma-transaction.manager.ts';
import { ID_PATTERN } from '#src/shared/utils/id.ts';

const params: InsertUserNotificationParams = {
  recipientId: 'recipient-1',
  eventId: 'event-1',
  category: 'comment.on_your_model',
  url: 'https://example.test/models/1',
  payload: { commentId: 'comment-1', excerpt: 'Nice model' },
  actorId: 'actor-1',
  targetType: 'model',
  targetId: 'model-1',
  inAppSuppressed: true,
};

function makeNotification(overrides: Partial<UserNotificationRecord> = {}): UserNotificationRecord {
  return {
    id: 'notification-1',
    recipientId: params.recipientId,
    eventId: params.eventId,
    category: params.category,
    url: params.url,
    payload: { commentId: 'comment-1', excerpt: 'Nice model' },
    actorId: 'actor-1',
    targetType: 'model',
    targetId: 'model-1',
    emailSentAt: null,
    readAt: null,
    inAppSuppressed: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function setup(returned: Array<UserNotificationRecord>, existing?: UserNotificationRecord) {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue(returned),
    userNotification: { findUniqueOrThrow: vi.fn().mockResolvedValue(existing) },
  };
  const db = {
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const transactionManager = makePrismaTransactionManager({ db: db as never });
  const repository = userNotificationRepository({ db } as never);
  return { tx, transactionManager, repository };
}

describe('user-notification repository', () => {
  describe('buildInsertNotificationQuery', () => {
    it('inserts every column in order, skipping a duplicate delivery key, and returns the notification', () => {
      const query = buildInsertNotificationQuery('id-1', params);

      expect(query.sql).toContain('ON CONFLICT ("eventId", "recipientId", "category") DO NOTHING');
      expect(query.sql).toContain('RETURNING *');
      expect(query.text).toContain('$6::jsonb');
      expect(query.values).toEqual([
        'id-1',
        'recipient-1',
        'event-1',
        'comment.on_your_model',
        'https://example.test/models/1',
        '{"commentId":"comment-1","excerpt":"Nice model"}',
        'actor-1',
        'model',
        'model-1',
        true,
      ]);
    });

    it('binds omitted optional columns as null', () => {
      const { actorId: _a, targetType: _t, targetId: _i, ...required } = params;

      const query = buildInsertNotificationQuery('id-1', required);

      expect(query.values.slice(-4, -1)).toEqual([null, null, null]);
    });
  });

  describe('insertTx', () => {
    it('returns the inserted notification without reading it back', async () => {
      const inserted = makeNotification();
      const { tx, transactionManager, repository } = setup([inserted]);

      const result = await transactionManager.run((ctx) => repository.insertTx(ctx, params));

      expect(result).toEqual(inserted);
      expect(tx.userNotification.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('generates the notification id on the application side', async () => {
      const { tx, transactionManager, repository } = setup([makeNotification()]);

      await transactionManager.run((ctx) => repository.insertTx(ctx, params));

      const [query] = tx.$queryRaw.mock.calls[0]!;
      expect(query.values[0]).toMatch(new RegExp(ID_PATTERN));
    });

    it('reads the existing notification back on the same transaction client when the key conflicts', async () => {
      const existing = makeNotification({ id: 'existing-1', emailSentAt: new Date('2026-01-02') });
      const { tx, transactionManager, repository } = setup([], existing);

      const result = await transactionManager.run((ctx) => repository.insertTx(ctx, params));

      expect(result).toEqual(existing);
      expect(tx.userNotification.findUniqueOrThrow).toHaveBeenCalledWith({
        where: {
          eventId_recipientId_category: {
            eventId: 'event-1',
            recipientId: 'recipient-1',
            category: 'comment.on_your_model',
          },
        },
      });
    });
  });

  describe('feed reads', () => {
    function setupFeed() {
      const db = {
        userNotification: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
      };
      return { db, repository: userNotificationRepository({ db } as never) };
    }

    it('lists only notifications that were not suppressed in-app at insert', async () => {
      const { db, repository } = setupFeed();

      await repository.findAllByRecipient(
        'recipient-1',
        { categories: ['comment.on_your_model'] },
        { limit: 20, page: 0, offset: 0, orderBy: { field: 'createdAt', param: 'desc' } },
      );

      const [findArgs] = db.userNotification.findMany.mock.calls[0]!;
      const [countArgs] = db.userNotification.count.mock.calls[0]!;
      expect(findArgs.where).toMatchObject({ recipientId: 'recipient-1', inAppSuppressed: false });
      expect(countArgs.where).toMatchObject({ recipientId: 'recipient-1', inAppSuppressed: false });
    });

    it('counts unread only over notifications that were not suppressed in-app at insert', async () => {
      const { db, repository } = setupFeed();

      await repository.countUnread('recipient-1', ['comment.on_your_model']);

      const [countArgs] = db.userNotification.count.mock.calls[0]!;
      expect(countArgs.where).toMatchObject({
        recipientId: 'recipient-1',
        readAt: null,
        inAppSuppressed: false,
      });
    });
  });
});
