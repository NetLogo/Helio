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
import { getDeadLetterQueueName } from '#src/workers/queues.ts';
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

type StoredRow = { id: string; targetId: string | null; createdAt: Date };

function removeWhere<T>(rows: Array<T>, predicate: (row: T) => boolean): number {
  const before = rows.length;
  rows.splice(0, rows.length, ...rows.filter((row) => !predicate(row)));
  return before - rows.length;
}

function createStore(rows: Array<StoredRow>, liveModelIds: Array<string>) {
  const stored = [...rows];
  const live = new Set(liveModelIds);
  const userNotificationRepository: NotificationJanitorDependencies['userNotificationRepository'] =
    {
      deleteOrphaned: vi.fn(async () =>
        removeWhere(stored, (row) => row.targetId !== null && !live.has(row.targetId)),
      ),
      deleteOlderThan: vi.fn(async (cutoff: Date) =>
        removeWhere(stored, (row) => row.createdAt < cutoff),
      ),
    };
  return {
    userNotificationRepository,
    listIds: () => stored.map((row) => row.id).sort(),
  };
}

function createRow(id: string, targetId: string | null, ageMs: number): StoredRow {
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

  it('removes rows whose target model is gone and keeps rows on a live model', async () => {
    const store = createStore(
      [
        createRow('live', 'model-live', MINUTE_MS),
        createRow('orphan', 'model-gone', MINUTE_MS),
        createRow('untargeted', null, MINUTE_MS),
      ],
      ['model-live'],
    );

    await purgeStore(store);

    expect(store.listIds()).toEqual(['live', 'untargeted']);
  });

  it('removes rows older than retentionMs and keeps younger ones', async () => {
    const store = createStore(
      [
        createRow('younger', 'model-live', config.retentionMs - MINUTE_MS),
        createRow('older', 'model-live', config.retentionMs + MINUTE_MS),
      ],
      ['model-live'],
    );

    await purgeStore(store);

    expect(store.listIds()).toEqual(['younger']);
  });

  it('logs how many rows each purge removed', async () => {
    const store = createStore(
      [
        createRow('orphan', 'model-gone', MINUTE_MS),
        createRow('older-a', 'model-live', config.retentionMs + MINUTE_MS),
        createRow('older-b', 'model-live', config.retentionMs + MINUTE_MS * 2),
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
    const store = createStore([createRow('orphan', 'model-gone', MINUTE_MS)], []);

    await startNotificationJanitor({
      boss,
      userNotificationRepository: store.userNotificationRepository,
      logger,
    });

    expect(bossInstance.createQueue).toHaveBeenCalledWith(config.queueName, {
      ...config.queue,
      deadLetter: getDeadLetterQueueName(config.queueName),
    });
    expect(bossInstance.schedule).toHaveBeenCalledWith(config.queueName, config.cronExpression);
    const [queueName, options, handler] = bossInstance.work.mock.calls[0]! as [
      string,
      unknown,
      () => Promise<void>,
    ];
    expect(queueName).toBe(config.queueName);
    expect(options).toEqual({ pollingIntervalSeconds: workersConfig.polling.intervalSeconds });
    await handler();
    expect(store.listIds()).toEqual([]);
  });
});
