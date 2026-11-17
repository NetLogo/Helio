import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FastifyBaseLogger } from 'fastify';
import type { PgBoss } from 'pg-boss';

const bossInstance = {
  work: vi.fn().mockResolvedValue(undefined),
  schedule: vi.fn().mockResolvedValue(undefined),
  createQueue: vi.fn().mockResolvedValue(undefined),
  updateQueue: vi.fn().mockResolvedValue(undefined),
};

const boss = bossInstance as unknown as PgBoss;

import workersConfig from '#src/config/workers.ts';
import { MINUTE_MS } from '#src/shared/utils/consts.ts';
import {
  purgeNotifications,
  startNotificationJanitor,
  type NotificationJanitorDependencies,
} from '#src/workers/notification-janitor.ts';

const config = workersConfig.notificationJanitor;
const now = new Date('2026-10-25T04:00:00Z');

const logger = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
} as unknown as FastifyBaseLogger;

type StoredNotification = { id: string; targetId: string | null; createdAt: Date };

function removeWhere<T>(notifications: Array<T>, predicate: (notification: T) => boolean): number {
  const before = notifications.length;
  notifications.splice(
    0,
    notifications.length,
    ...notifications.filter((notification) => !predicate(notification)),
  );
  return before - notifications.length;
}

function createStore(notifications: Array<StoredNotification>, liveModelIds: Array<string>) {
  const stored = [...notifications];
  const live = new Set(liveModelIds);
  const userNotificationRepository: NotificationJanitorDependencies['userNotificationRepository'] =
    {
      deleteOrphaned: vi.fn(async () =>
        removeWhere(
          stored,
          (notification) => notification.targetId !== null && !live.has(notification.targetId),
        ),
      ),
      deleteOlderThan: vi.fn(async (cutoff: Date) =>
        removeWhere(stored, (notification) => notification.createdAt < cutoff),
      ),
    };
  return {
    userNotificationRepository,
    listIds: () => stored.map((notification) => notification.id).sort(),
  };
}

function createNotification(
  id: string,
  targetId: string | null,
  ageMs: number,
): StoredNotification {
  return { id, targetId, createdAt: new Date(now.getTime() - ageMs) };
}

function purgeStore(store: ReturnType<typeof createStore>): Promise<void> {
  return purgeNotifications({
    userNotificationRepository: store.userNotificationRepository,
    logger,
  });
}

describe('purgeNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('removes notifications whose target model is gone and keeps notifications on a live model', async () => {
    const store = createStore(
      [
        createNotification('live', 'model-live', MINUTE_MS),
        createNotification('orphan', 'model-gone', MINUTE_MS),
        createNotification('untargeted', null, MINUTE_MS),
      ],
      ['model-live'],
    );

    await purgeStore(store);

    expect(store.listIds()).toEqual(['live', 'untargeted']);
  });

  it('removes notifications older than retentionMs and keeps younger ones', async () => {
    const store = createStore(
      [
        createNotification('younger', 'model-live', config.retentionMs - MINUTE_MS),
        createNotification('older', 'model-live', config.retentionMs + MINUTE_MS),
      ],
      ['model-live'],
    );

    await purgeStore(store);

    expect(store.listIds()).toEqual(['younger']);
  });

  it('logs how many notifications each purge removed', async () => {
    const store = createStore(
      [
        createNotification('orphan', 'model-gone', MINUTE_MS),
        createNotification('older-a', 'model-live', config.retentionMs + MINUTE_MS),
        createNotification('older-b', 'model-live', config.retentionMs + MINUTE_MS * 2),
      ],
      ['model-live'],
    );

    await purgeStore(store);

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        orphanedCount: 1,
        expiredCount: 2,
      }),
      expect.any(String),
    );
  });
});

describe('startNotificationJanitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs a purge when its queue fires on the configured schedule', async () => {
    const store = createStore([createNotification('orphan', 'model-gone', MINUTE_MS)], []);

    await startNotificationJanitor({
      boss,
      userNotificationRepository: store.userNotificationRepository,
      logger,
    });

    expect(bossInstance.schedule).toHaveBeenCalledWith(config.queueName, config.cronExpression);
    const [queueName, handler] = bossInstance.work.mock.calls[0]! as [string, () => Promise<void>];
    expect(queueName).toBe(config.queueName);
    await handler();
    expect(store.listIds()).toEqual([]);
  });
});
